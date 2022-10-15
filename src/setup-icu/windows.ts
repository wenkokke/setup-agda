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

  try {
    core.info(await util.pkgConfig('--list-all'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.pkgConfig('--variable', 'libdir', 'icu'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.pkgConfig('--variable', 'libdir', 'icu-i18n'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.pkgConfig('--variable', 'libdir', 'icu-uc'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.pkgConfig('--variable', 'libdir', 'icu-io'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.lsR('C:\\msys64\\mingw64'))
  } catch {
    // Ignore
  }
  try {
    core.info(await util.lsR('C:\\usr'))
  } catch {
    // Ignore
  }

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
}

export async function bundleForWindows(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const libDirFrom = 'C:\\msys64\\mingw64\\bin'
  const libPattern = path.join(libDirFrom, 'libicu*.dll')
  core.info(`Searching with:${os.EOL}${libPattern}`)
  const libGlobber = await glob.create(libPattern)
  const libsFrom = await libGlobber.glob()
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
