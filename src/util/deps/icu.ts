import * as path from 'node:path'
import fs from 'fs-extra'
import pkgConfig from './pkg-config.js'
import { platform } from '../platform.js'
import brew from './homebrew.js'
import glob from 'glob'
import { agdaComponents, BuildOptions } from '../types.js'
import patchelf from './patchelf.js'
import * as simver from '../simver.js'
import installNameTool from './install-name-tool.js'
import msys from './msys.js'
import otool from './otool.js'

export function icuNeeded(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  // TODO:
  //   The check for 'enable-cluster-counting' in the 'configure-options' fails
  //   if the user passes, e.g., --flags=-enable-cluster-counting.
  return (
    (simver.gte(options['agda-version'], '2.5.3') ||
      options['agda-version'] === 'HEAD') &&
    options['configure-options'].includes('enable-cluster-counting')
  )
}

/**
 * Add `--extra-include-dirs` and `--extra-lib-dirs` flags to the
 * configure-options using the pkg-config variables `includedir` and `libdir`.
 *
 * TODO: detect Homebrew version of ICU
 */
export async function icuConfigureOptions(
  options: BuildOptions
): Promise<BuildOptions> {
  // Add --extra-include-dirs and --extra-lib-dirs
  const { version, includedirs, libdirs } = await icuGetInfo()
  logger.debug(`Found icu-i18n ${version}`)
  for (const includedir of includedirs)
    options['configure-options'] += ` --extra-include-dirs=${includedir}`
  for (const libdir of libdirs)
    options['configure-options'] += ` --extra-lib-dirs=${libdir}`
  // On macOS: add PKG_CONFIG_PATH
  if (platform === 'macos') {
    options.env = options.env ?? {}
    options.env.PKG_CONFIG_PATH = await icuGetPkgConfigPath(
      options.env.PKG_CONFIG_PATH
    )
  }

  // On Windows: add MSYS
  if (platform === 'windows')
    for (const msysPath of msys.paths)
      options['configure-options'] += ` --extra-prog-path=${msysPath}`
  logger.debug(`Extended configure options: ${options['configure-options']}`)
  return options
}

/** Get the value of the `PKG_CONFIG_PATH` updated for ICU. */
async function icuGetPkgConfigPath(pkgConfigPath?: string): Promise<string> {
  // Get the entries currently in the PKG_CONFIG_PATH:
  const pkgConfigDirs = pkgConfig.splitPath(
    pkgConfigPath ?? process.env?.PKG_CONFIG_PATH
  )
  // Optionally add the path for ICU:
  switch (platform) {
    case 'macos': {
      try {
        const prefix = await brew.getPrefix('icu4c')
        const [pkgConfigFile] = glob.sync(
          path.join(prefix, '**', 'icu-i18n.pc')
        )
        if (pkgConfigFile === undefined)
          logger.warning(`Could not find icu-i18n.pc in ${prefix}`)
        pkgConfigDirs.push(path.dirname(pkgConfigFile))
      } catch (error) {
        /* empty */
      }
      break
    }
    case 'linux': {
      break
    }
    case 'windows': {
      break
    }
  }
  return pkgConfig.joinPath(pkgConfigDirs)
}

/** The name of the main ICU library used by Agda. */
const libname = platform === 'windows' ? 'icu-io' : 'icu-i18n'

/** The set of ICU libraries used by Agda. */
const libnames = new Set<string>([libname, 'icu-i18n', 'icu-uc'])

/** Get the ICU version via pkg-config. */
export async function icuGetVersion(): Promise<string> {
  const PKG_CONFIG_PATH = await icuGetPkgConfigPath()
  return await pkgConfig.getVersion(libname, { env: { PKG_CONFIG_PATH } })
}

/** Get the ICU version, includedir, and libdir via pkg-config. */
export async function icuGetInfo(): Promise<{
  version: string
  includedirs: string[]
  libdirs: string[]
}> {
  const PKG_CONFIG_PATH = await icuGetPkgConfigPath()
  const version = await pkgConfig.getVersion(libname, {
    env: { PKG_CONFIG_PATH }
  })
  // TODO: This hardcodes the dependencies of ICU, but it would be much more
  //       robust to simply fetch the REQUIRES field, and add the include and
  //       lib directories for each dependency, recursively.
  const includedirs = new Set<string>()
  const libdirs = new Set<string>()
  for (const libname of libnames) {
    includedirs.add(
      await pkgConfig.getVariable(libname, 'includedir', {
        env: { PKG_CONFIG_PATH }
      })
    )
    libdirs.add(
      await pkgConfig.getVariable(libname, 'libdir', {
        env: { PKG_CONFIG_PATH }
      })
    )
  }
  return {
    version,
    includedirs: [...includedirs],
    libdirs: [...libdirs]
  }
}

// NOTE: This module hardcodes a number of assumptions about libicu which may
//       not always be true, e.g., library name starts with 'libicu', binaries
//       are linked against the major version on Linux and Windows but against
//       the entire version on MacOS, the internal dependencies of ICU, etc.

// NOTE: This module could be rewritten to be much closer to 'repairwheel' by
//       maintaining a list of allowed libraries (like 'manylinux') and using
//       `dumpbin`, `patchelf` and `otool` to find and bundle *all* libraries
//       that aren't on that list.

export async function icuBundle(
  dest: string,
  options: BuildOptions
): Promise<void> {
  const { version, libdirs } = await icuGetInfo()
  const versionMajor = simver.major(version)
  logger.debug(`Found ICU ${version}`)
  switch (platform) {
    case 'linux': {
      // Find the ICU libraries on the system:
      //
      // NOTE: This assumes the installed versions of libicui18n, libicuuc,
      //       and libicudata all share the same version number.
      //
      const libnames = ['libicui18n', 'libicuuc', 'libicudata']
      const libs = new Set<string>()
      for (const libdir of libdirs) {
        for (const libname of libnames) {
          const pattern = path.join(libdir, `${libname}.so.${version}`)
          for (const lib of glob.sync(pattern)) {
            logger.debug(`Found ${lib}`)
            libs.add(lib)
          }
        }
      }
      // Copy the found ICU libraries and update their sonames:
      await fs.mkdirp(path.join(dest, 'lib'))
      for (const libFrom of libs) {
        const libName = path.basename(libFrom, `.so.${version}`)
        const libNameTo = `agda-${options['agda-version']}-${libName}.so.${version}`
        const libTo = path.join(dest, 'lib', libNameTo)
        await fs.copyFile(libFrom, libTo)
        await patchelf(['--set-soname', libNameTo, libTo])
      }
      // Change the internal dependencies between the libraries:
      const libsAndDepsToChange: [string, string[]][] = [
        ['libicui18n', ['libicuuc']],
        ['libicuuc', ['libicudata']]
      ]
      for (const [libName, depNames] of libsAndDepsToChange) {
        const agdaVersion = options['agda-version']
        const libNameTo = `agda-${agdaVersion}-${libName}.so.${version}`
        const libTo = path.join(dest, 'lib', libNameTo)
        for (const depName of depNames) {
          const depNameFrom = `${depName}.so.${versionMajor}`
          const depNameTo = `agda-${agdaVersion}-${depName}.so.${version}`
          await patchelf(['--replace-needed', depNameFrom, depNameTo, libTo])
        }
        // NOTE: This overrides any previously set run path.
        await patchelf(['--set-rpath', '$ORIGIN', libTo])
      }
      // Change dependencies on Agda executables:
      const binsAndDepsToChange: [string, string[]][] = [
        [
          agdaComponents['Agda:exe:agda'].exe,
          ['libicui18n', 'libicuuc', 'libicudata']
        ]
      ]
      for (const [binName, depNames] of binsAndDepsToChange) {
        const binPath = path.join(dest, 'bin', binName)
        for (const depName of depNames) {
          const depFrom = `${depName}.so.${versionMajor}`
          const depTo = `agda-${options['agda-version']}-${depName}.so.${version}`
          await patchelf(['--replace-needed', depFrom, depTo, binPath])
        }
        // NOTE: This overrides any previously set run path.
        await patchelf(['--set-rpath', '$ORIGIN/../lib', binPath])
      }
      break
    }
    case 'macos': {
      // Find the ICU libraries on the system:
      //
      // NOTE: This assumes the installed versions of libicui18n, libicuuc,
      //       and libicudata all share the same version number.
      //
      const libnames = ['libicui18n', 'libicuuc', 'libicudata']
      const libs = new Set<string>()
      for (const libdir of libdirs) {
        for (const libname of libnames) {
          const pattern = path.join(libdir, `${libname}.${version}.dylib`)
          for (const lib of glob.sync(pattern)) {
            logger.debug(`Found ${lib}`)
            libs.add(lib)
          }
        }
      }
      // Copy the found ICU libraries and update their ids:
      await fs.mkdirp(path.join(dest, 'lib'))
      for (const libFrom of libs) {
        const libName = path.basename(libFrom, `.${version}.dylib`)
        const libNameTo = `agda-${options['agda-version']}-${libName}.${version}.dylib`
        const libTo = path.join(dest, 'lib', libNameTo)
        await fs.copy(libFrom, libTo, { dereference: true })
        await installNameTool(['-id', libNameTo, libTo])
      }
      // Change the internal dependencies between the libraries:
      const libsAndDepsToChange: [string, string[]][] = [
        ['libicui18n', ['libicudata', 'libicuuc']],
        ['libicuuc', ['libicudata']]
      ]
      for (const [libName, depNames] of libsAndDepsToChange) {
        const agdaVersion = options['agda-version']
        const libNameTo = `agda-${agdaVersion}-${libName}.${version}.dylib`
        const libTo = path.join(dest, 'lib', libNameTo)
        for (const depName of depNames) {
          const depFrom = `@loader_path/${depName}.${versionMajor}.dylib`
          const depTo = `@loader_path/agda-${options['agda-version']}-${depName}.${version}.dylib`
          await installNameTool.change(depFrom, depTo, libTo)
        }
      }
      // Change dependencies on Agda executables:
      const binsAndDepsToChange: [string, string[]][] = [
        [agdaComponents['Agda:exe:agda'].exe, ['libicuuc', 'libicui18n']]
      ]
      for (const [binName, depNames] of binsAndDepsToChange) {
        const binPath = path.join(dest, 'bin', binName)
        const binLibs = await otool.getSharedLibraries(binPath)
        for (const depName of depNames) {
          const libFrom = binLibs.find((lib) =>
            path
              .basename(lib)
              .match(new RegExp(`^${depName}\\.([\\d.]+)\\.dylib$`))
          )
          if (libFrom === undefined) {
            logger.warning(`skip ${depName}: not in [${binLibs.join(', ')}]`)
          } else {
            const libNameTo = `agda-${options['agda-version']}-${depName}.${version}.dylib`
            const libTo = `@executable_path/../lib/${libNameTo}`
            await installNameTool.change(libFrom, libTo, binPath)
          }
        }
      }
      break
    }
    case 'windows': {
      // Add MSYS64 paths, which is where Pacman installs the actual DLLs:
      libdirs.push('C:\\msys64\\mingw64\\bin')
      libdirs.push('C:\\msys64\\usr\\bin')
      // Find the ICU libraries on the system:
      //
      // NOTE: This assumes the installed versions of libicui18n, libicuuc,
      //       and libicudata all share the same version number.
      //
      const libnames = ['libicuin', 'libicuuc', 'libicudt', 'libicuio']
      const libs = new Set<string>()
      for (const libdir of libdirs) {
        for (const libname of libnames) {
          const pattern = path.join(libdir, `${libname}${versionMajor}.dll`)
          for (const lib of glob.sync(pattern)) {
            logger.debug(`Found ${lib}`)
            libs.add(lib)
          }
        }
      }
      // Copy the found ICU libraries:
      for (const libFrom of libs) {
        const libName = path.basename(libFrom)
        const libTo = path.join(dest, 'bin', libName)
        await fs.copyFile(libFrom, libTo)
      }
      break
    }
  }
}
