import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from './opts'
import * as util from './util'
import assert from 'node:assert'

// export async function setup(options: opts.BuildOptions): Promise<void> {
//   switch (opts.os) {
//     case 'linux': {
//       // Ubuntu 20.04 ships with a recent version of ICU
//       // Get the icu-i18n information via pkg-config:
//       options['icu-version'] = await pkgConfig('--modversion', 'icu-i18n')
//       core.info(`Found ICU version ${options['icu-version']}`)
//       const icuVersionMajor = simver.major(options['icu-version'])
//       const icuLibGlobber = await glob.create(
//         icuLibNames
//           .flatMap(libName => [
//             `/usr/lib/${libName}.so`,
//             `/usr/lib/${libName}.so.${icuVersionMajor}`,
//             `/usr/lib/${libName}.so.${options['icu-version']}`
//           ])
//           .join(os.EOL)
//       )
//       options['bdist-libs'] = await icuLibGlobber.glob()
//       core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
//       break
//     }
//     case 'macos': {
//       // Ensure ICU is installed:
//       let icuVersion = await brewGetVersion('icu4c')
//       if (icuVersion === undefined) brew('install', 'icu4c')
//       else if (simver.lt(icuVersion, '68')) brew('upgrade', 'icu4c')
//       icuVersion = await brewGetVersion('icu4c')
//       if (icuVersion === undefined) throw Error('Could not install icu4c')

//       // Find the ICU installation location:
//       const icuPrefix = (await brew('--prefix', 'icu4c')).trim()
//       const icuLibDir = path.join(icuPrefix, 'lib')
//       core.debug(`Found ICU version ${icuVersion} at ${icuLibDir}`)

//       // Add ICU to the PKG_CONFIG_PATH:
//       const icuPkgConfigDir = path.join(icuLibDir, 'pkgconfig')
//       core.debug(`Set PKG_CONFIG_PATH to ${icuPkgConfigDir}`)
//       core.exportVariable('PKG_CONFIG_PATH', icuPkgConfigDir)

//       // Get the icu-i18n version via pkg-config:
//       icuVersion = await pkgConfig('--modversion', 'icu-i18n')
//       options['icu-version'] = icuVersion.trim()
//       core.info(`Setup ICU version ${options['icu-version']} with pkg-config`)

//       // Get the ICU libraries to bundle:
//       const icuVersionMajor = simver.major(options['icu-version'])
//       const icuLibGlobber = await glob.create(
//         icuLibNames
//           .flatMap(libName => [
//             `${path.join(icuLibDir, libName)}.dylib`,
//             `${path.join(icuLibDir, libName)}.${icuVersionMajor}.dylib`,
//             `${path.join(icuLibDir, libName)}.${options['icu-version']}.dylib`
//           ])
//           .join(os.EOL)
//       )
//       options['bdist-libs'] = await icuLibGlobber.glob()
//       core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
//       break
//     }
//     case 'windows': {
//       core.info('Install pkg-config and ICU using Pacman')
//       core.addPath('C:\\msys64\\mingw64\\bin')
//       core.addPath('C:\\msys64\\usr\\bin')
//       await pacman(
//         '-v',
//         '--noconfirm',
//         '-Sy',
//         'mingw-w64-x86_64-pkg-config',
//         'mingw-w64-x86_64-icu'
//       )

//       // Get the icu-i18n version via pacman:
//       options['icu-version'] = await pacmanGetVersion('mingw-w64-x86_64-icu')
//       core.info(`Installed ICU version ${options['icu-version']}`)

//       // Get the ICU libraries to bundle:
//       const icuLibDir = 'C:\\msys64\\mingw64\\bin'
//       const icuLibGlobber = await glob.create(path.join(icuLibDir, 'icu*.dll'))
//       options['bdist-libs'] = await icuLibGlobber.glob()
//       core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
//       break
//     }
//   }
// }

export async function setup(options: opts.BuildOptions): Promise<void> {
  switch (opts.os) {
    case 'linux':
      return await setupForLinux(options)
    case 'macos':
      return await setupForMacOS(options)
    case 'windows':
      return await setupForWindows(options)
  }
}

export async function bundle(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.os) {
    case 'linux':
      return await bundleForLinux(distDir, options)
    case 'macos':
      return await bundleForMacOS(distDir, options)
    case 'windows':
      return await bundleForWindows(distDir, options)
  }
}

// Linux

async function installDirForLinux(icuVersion: string): Promise<string> {
  return path.join(opts.agdaDir(), 'icu', icuVersion)
}

async function setupForLinux(options: opts.BuildOptions): Promise<void> {
  const icuVersion = '71.1'
  const icuPkgKey = `icu-${icuVersion}-${os.arch()}-${os.platform()}`
  const icuPkgUrl = opts.packageIndex[icuPkgKey]
  if (icuPkgUrl === undefined) throw Error(`No package for ${icuPkgKey}`)

  // Download ICU package:
  const icuTar = await tc.downloadTool(icuPkgUrl)
  const prefix = await installDirForLinux(icuVersion)
  const tarArgs = ['--extract', '--gzip', '--strip-components=4']
  const prefixTC = await tc.extractTar(icuTar, prefix, tarArgs)
  assert(prefix === prefixTC)

  // Set PKG_CONFIG_PATH & change prefix in icu-i18n.pc:
  const pkgConfigDir = path.join(prefix, 'lib', 'pkgconfig')
  util.sed(
    '-i',
    `'s/^prefix =.*/prefix = ${prefix.replace(/\//g, '\\/')}/'`,
    path.join(pkgConfigDir, 'icu-i18n.pc')
  )
  core.exportVariable('PKG_CONFIG_PATH', pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version installed differs from ICU version reported by pkg-config'
  )
}

async function bundleForLinux(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForLinux(options['icu-version'])

  core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
    const libNameFrom = `${libName}.so.${options['icu-version']}`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await util.cp(libFrom, libTo)
    // Change the library ID:
    await util.patchelf('--set-soname', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = util.simver.major(options['icu-version'])
  const libDepsToChange = [
    ['libicui18n', ['libicuuc']],
    ['libicuuc', ['libicudata']]
  ]
  for (const [libName, depNames] of libDepsToChange) {
    const libNameTo = `agda-${options['agda-version']}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    for (const depName of depNames) {
      const depFrom = `${depName}.so.${icuVerMaj}`
      const depTo = `agda-${options['agda-version']}-${depName}.so`
      await util.patchelf('--replace-needed', depFrom, depTo, libTo)
    }
    await util.patchelf('--add-rpath', "'$ORIGIN'")
  }

  // Change dependencies on Agda executable:
  const agdaBinPath = path.join(distBinDir, util.agdaBinName)
  const binDepsToChange = ['libicui18n', 'libicuuc', 'libicudata']
  for (const depName of binDepsToChange) {
    const depNameFrom = `${depName}.so.${icuVerMaj}`
    const depNameTo = `agda-${options['agda-version']}-${depName}.so`
    await util.patchelf('--replace-needed', depNameFrom, depNameTo, agdaBinPath)
  }
  await util.patchelf('--add-rpath', "'$ORIGIN/../lib'", agdaBinPath)
}

// MacOS

async function installDirForMacOS(): Promise<string> {
  return await util.brew('--prefix', 'icu4c')
}

async function setupForMacOS(options: opts.BuildOptions): Promise<void> {
  // Ensure ICU is installed:
  let icuVersion = await util.brewGetVersion('icu4c')
  core.debug(`Found ICU version: ${icuVersion}`)
  if (icuVersion === undefined) {
    util.brew('install', 'icu4c')
    icuVersion = await util.brewGetVersion('icu4c')
    core.debug(`Installed ICU version: ${icuVersion}`)
  }
  if (icuVersion === undefined) throw Error('Could not install icu4c')

  // Find the ICU installation location:
  const prefix = await installDirForMacOS()
  core.debug(`Found ICU version ${icuVersion} at ${prefix}`)

  // Set PKG_CONFIG_PATH:
  const pkgConfigDir = path.join(prefix, 'lib', 'pkgconfig')
  core.exportVariable('PKG_CONFIG_PATH', pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version reported by Homebrew differs from ICU version reported by pkg-config'
  )
}

async function bundleForMacOS(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForMacOS()
  core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
    const libNameFrom = `${libName}.${options['icu-version']}.dylib`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await util.cp(libFrom, libTo)
    // Change the library ID:
    await util.installNameTool('-id', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = util.simver.major(options['icu-version'])
  const libDepsToChange = [
    ['libicui18n', ['libicudata', 'libicuuc']],
    ['libicuuc', ['libicudata']]
  ]
  for (const [libName, depNames] of libDepsToChange) {
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = path.join(distLibDir, libNameTo)
    for (const depName of depNames) {
      const depFrom = `@loader_path/${depName}.${icuVerMaj}.dylib`
      const depTo = `@loader_path/agda-${options['agda-version']}-${depName}.dylib`
      await util.installNameTool('-change', depFrom, depTo, libTo)
    }
  }

  // Change dependencies on Agda executable:
  const agdaBinPath = path.join(distBinDir, util.agdaBinName)
  const binDepsToChange = ['libicui18n', 'libicuuc']
  for (const libName of binDepsToChange) {
    const libNameFrom = `${libName}.${options['icu-version']}.dylib`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = `@executable_path/../lib/${libNameTo}`
    await util.installNameTool('-change', libFrom, libTo, agdaBinPath)
  }
}

// Windows

async function installDirForWindows(icuVersion: string): Promise<string> {
  return path.join(opts.agdaDir(), 'icu', icuVersion)
}

async function setupForWindows(options: opts.BuildOptions): Promise<void> {
  const icuVersion = '71.1'
  const icuPkgKey = `icu-${icuVersion}-${os.arch()}-${os.platform()}`
  const icuPkgUrl = opts.packageIndex[icuPkgKey]
  if (icuPkgUrl === undefined) throw Error(`No package for ${icuPkgKey}`)

  // Download ICU package:
  const icuZip = await tc.downloadTool(icuPkgUrl)
  const tmpDir = await tc.extractZip(icuZip)
  const prefix = await installDirForWindows(icuVersion)
  util.mkdirP(path.dirname(prefix))
  util.mv(tmpDir, prefix)

  // Install pkg-config:
  core.addPath('C:\\msys64\\mingw64\\bin')
  core.addPath('C:\\msys64\\usr\\bin')
  await util.pacman('-v', '--noconfirm', '-Sy', 'mingw-w64-x86_64-pkg-config')

  // Create pkg-config file:
  const pkgConfigDir = path.join(prefix, 'pkgconfig')
  util.mkdirP(pkgConfigDir)

  // Create icu-i18n.pc
  fs.writeFileSync(
    path.join('icu-i18n.pc'),
    [
      `prefix = ${prefix}`,
      `exec_prefix = ${prefix}/bin64`,
      `includedir = ${prefix}/include`,
      `libdir = ${prefix}/bin64`,
      'baselibs = -lpthread -ldl -lm',
      '',
      `Version: ${icuVersion}`,
      `Cflags: -I${prefix}/include`,
      '# end of icu.pc.in',
      'Description: International Components for Unicode: Internationalization library',
      'Name: icu-i18n',
      'Requires: icu-uc',
      'Libs: -licuin'
    ].join(os.EOL)
  )
  // Create icu-uc.pc
  fs.writeFileSync(
    path.join('icu-i18n.pc'),
    [
      `prefix = ${prefix}`,
      `exec_prefix = ${prefix}/bin64`,
      `includedir = ${prefix}/include`,
      `libdir = ${prefix}/bin64`,
      'baselibs = -lpthread -ldl -lm',
      '',
      `Version: ${icuVersion}`,
      `Cflags: -I${prefix}/include`,
      '# end of icu.pc.in',
      'Description: International Components for Unicode: Common and Data libraries',
      'Name: icu-uc',
      `Libs: -L${prefix}/bin64 -licuuc -licudt`,
      'Libs.private: ${baselibs}'
    ].join(os.EOL)
  )
  core.exportVariable('PKG_CONFIG_PATH', pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version installed differs from ICU version reported by pkg-config'
  )
}

async function bundleForWindows(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForWindows(options['icu-version'])
  core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'bin')
  const icuVerMaj = util.simver.major(options['icu-version'])

  // Copy library files
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicuin', 'libicuuc', 'libicudt']) {
    const libFullName = `${libName}${icuVerMaj}.dll`
    const libFrom = path.join(prefix, 'bin64', libFullName)
    const libTo = path.join(distLibDir, libFullName)
    // Copy the library:
    await util.cp(libFrom, libTo)
  }
}
