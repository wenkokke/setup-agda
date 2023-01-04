import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../../../opts'
import * as logging from '../../logging'
import {pacman} from '../pacman'
import {
  pkgConfigGetInfo,
  pkgConfigGetVariable,
  pkgConfigGetVersion
} from '../pkg-config'
import ensureError from '../../ensure-error'
import {cp, mkdirP} from '../../exec'
import * as simver from '../../simver'

// Windows

export async function setupForWindows(
  options: opts.BuildOptions
): Promise<void> {
  // Install pkg-config & ICU:
  core.addPath('C:\\msys64\\mingw64\\bin')
  core.addPath('C:\\msys64\\usr\\bin')
  await pacman(
    '-v',
    '--noconfirm',
    '-Sy',
    'mingw-w64-x86_64-pkg-config',
    'mingw-w64-x86_64-icu'
  )

  // Find the ICU version:
  options['icu-version'] = await pkgConfigGetVersion('icu-i18n')

  // Add extra-{include,lib}-dirs:
  options['extra-include-dirs'].push(
    core.toPlatformPath(await pkgConfigGetVariable('icu-i18n', 'includedir'))
  )
  // NOTE:
  //   The libdir (C:\msys64\mingw64\lib) only contains libicu*.dll.a,
  //   not libicu*.dll. I'm not sure what the .dll.a files are?
  for (const libDir of await icuGetLibDirs())
    options['extra-lib-dirs'].push(libDir)

  // Print ICU package info:
  try {
    logging.info(JSON.stringify(await pkgConfigGetInfo('icu-io')))
  } catch (error) {
    logging.info(ensureError(error).message)
  }
}

export async function bundleForWindows(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  logging.info(`Bundle ICU version ${options['icu-version']}`)
  const libVerMaj = simver.major(options['icu-version'])
  const libDirsFrom = await icuGetLibDirs()
  const libFromPatterns = [...libDirsFrom]
    .flatMap<string>(libDir =>
      ['libicuin', 'libicuuc', 'libicudt', 'libicuio'].flatMap<string>(
        libName => path.join(libDir, `${libName}${libVerMaj}.dll`)
      )
    )
    .join(os.EOL)
  logging.info(`Searching with:${os.EOL}${libFromPatterns}`)
  const libFromGlobber = await glob.create(libFromPatterns)
  const libsFrom = await libFromGlobber.glob()
  logging.info(`Found libraries:${os.EOL}${libsFrom.join(os.EOL)}`)

  // Copy library files
  const libDirTo = path.join(distDir, 'bin')
  logging.info(`Copy ICU ${options['icu-version']} in ${libDirTo}`)
  await mkdirP(libDirTo)
  for (const libFrom of libsFrom) {
    const libName = path.basename(libFrom)
    const libTo = path.join(libDirTo, libName)
    // Copy the library:
    await cp(libFrom, libTo)
  }
}

async function icuGetLibDirs(): Promise<Set<string>> {
  const icuInLibDir = await pkgConfigGetVariable('icu-i18n', 'libdir')
  const icuUcLibDir = await pkgConfigGetVariable('icu-uc', 'libdir')
  const icuIoLibDir = await pkgConfigGetVariable('icu-io', 'libdir')
  return new Set<string>([
    'C:\\msys64\\mingw64\\bin',
    'C:\\msys64\\usr\\bin',
    core.toPlatformPath(icuInLibDir),
    core.toPlatformPath(icuUcLibDir),
    core.toPlatformPath(icuIoLibDir)
  ])
}
