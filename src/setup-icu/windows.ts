import * as core from '@actions/core'
import * as glob from '@actions/glob'

import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

// Windows

export async function setupForWindows(
  options: opts.BuildOptions
): Promise<void> {
  // Install pkg-config & ICU:
  core.addPath('C:\\msys64\\mingw64\\bin')
  core.addPath('C:\\msys64\\usr\\bin')
  await util.pacman(
    '-v',
    '--noconfirm',
    '-Sy',
    'mingw-w64-x86_64-pkg-config',
    'mingw-w64-x86_64-icu'
  )

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')

  // Add extra-{include,lib}-dirs:
  options['extra-include-dirs'].push(
    await util.pkgConfig('--variable', 'includedir', 'icu-i18n')
  )
  // TODO: 'C:\msys64\mingw64\lib' only contains 'libicu*.dll.a'
  options['extra-lib-dirs'].push(
    await util.pkgConfig('--variable', 'libdir', 'icu-i18n')
  )
  options['extra-lib-dirs'].push('C:\\msys64\\mingw64\\bin')
  options['extra-lib-dirs'].push('C:\\msys64\\usr\\bin')

  // Print ICU package info:
  try {
    core.info(JSON.stringify(await util.pkgConfigGetInfo('icu-io')))
  } catch (error) {
    core.debug(util.ensureError(error).message)
  }
}

export async function bundleForWindows(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  core.info(`Bundle ICU version ${options['icu-version']}`)
  const libVerMaj = util.simver.major(options['icu-version'])
  const libDirsFrom = new Set<string>()
  libDirsFrom.add('C:\\msys64\\mingw64\\bin')
  libDirsFrom.add('C:\\msys64\\usr\\bin')
  libDirsFrom.add(await util.pkgConfig('--variable', 'libdir', 'icu-i18n'))
  libDirsFrom.add(await util.pkgConfig('--variable', 'libdir', 'icu-uc'))
  libDirsFrom.add(await util.pkgConfig('--variable', 'libdir', 'icu-io'))
  const libFromPatterns = [...libDirsFrom]
    .flatMap<string>(libDir =>
      ['libicuin', 'libicuuc', 'libicudt', 'libicuio'].flatMap<string>(
        libName => path.join(libDir, `${libName}${libVerMaj}.dll`)
      )
    )
    .join(os.EOL)
  core.info(`Searching with:${os.EOL}${libFromPatterns}`)
  const libFromGlobber = await glob.create(libFromPatterns)
  const libsFrom = await libFromGlobber.glob()
  core.info(`Found libraries:${os.EOL}${libsFrom.join(os.EOL)}`)

  // Copy library files
  const libDirTo = path.join(distDir, 'bin')
  core.debug(`Copy ICU ${options['icu-version']} in ${libDirTo}`)
  await util.mkdirP(libDirTo)
  for (const libFrom of libsFrom) {
    const libName = path.basename(libFrom)
    const libTo = path.join(libDirTo, libName)
    // Copy the library:
    await util.cp(libFrom, libTo)
  }
}
