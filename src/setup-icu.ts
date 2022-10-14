import * as core from '@actions/core'
import * as glob from '@actions/glob'
import assert from 'node:assert'
import * as path from 'node:path'
import * as opts from './opts'
import {
  brew,
  brewGetVersion,
  pacman,
  pacmanGetVersion,
  pkgConfig,
  simver
} from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  switch (opts.os) {
    case 'windows': {
      core.info('Install pkg-config and ICU using Pacman')
      core.addPath('C:\\msys64\\mingw64\\bin')
      core.addPath('C:\\msys64\\usr\\bin')
      await pacman(
        '-v',
        '--noconfirm',
        '-Sy',
        'mingw-w64-x86_64-pkg-config',
        'mingw-w64-x86_64-icu'
      )
      // Get the icu-i18n version via pacman:
      options['icu-version'] = await pacmanGetVersion('mingw-w64-x86_64-icu')
      core.info(`Installed ICU version ${options['icu-version']}`)

      // Get the ICU libraries to bundle:
      const icuLibDir = 'C:\\msys64\\mingw64\\bin'
      const icuLibGlobber = await glob.create(path.join(icuLibDir, 'icu*.dll'))
      options['bdist-libs'] = await icuLibGlobber.glob()
      core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
      break
    }
    case 'linux': {
      // Ubuntu 20.04 ships with a recent version of ICU
      // Get the icu-i18n information via pkg-config:
      options['icu-version'] = await pkgConfig('--modversion', 'icu-i18n')
      core.info(`Found ICU version ${options['icu-version']}`)
      const icuLibGlobber = await glob.create('/usr/lib/libicu*.so.*')
      options['bdist-libs'] = await icuLibGlobber.glob()
      core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
      break
    }
    case 'macos': {
      // Ensure ICU is installed:
      let icuVersion = await brewGetVersion('icu4c')
      if (icuVersion === undefined) brew('install', 'icu4c')
      else if (simver.lt(icuVersion, '68')) brew('upgrade', 'icu4c')
      icuVersion = await brewGetVersion('icu4c')
      if (icuVersion === undefined) throw Error('Could not install icu4c')

      // Find the ICU installation location:
      const icuPrefix = await brew('--prefix', 'icu4c')
      const icuLibDir = path.join(icuPrefix.trim(), 'lib')
      core.debug(`Found ICU version ${icuVersion} at ${icuLibDir}`)

      // Add ICU to the PKG_CONFIG_PATH:
      const icuPkgConfigDir = path.join(icuLibDir, 'pkgconfig')
      core.debug(`Set PKG_CONFIG_PATH to ${icuPkgConfigDir}`)
      core.exportVariable('PKG_CONFIG_PATH', icuPkgConfigDir)

      // Get the icu-i18n version via pkg-config:
      options['icu-version'] = await pkgConfig('--modversion', 'icu-i18n')
      core.info(`Setup ICU version ${options['icu-version']} with pkg-config`)

      // Get the ICU libraries to bundle:
      const icuLibGlobber = await glob.create(path.join(icuLibDir, '*.dylib'))
      options['bdist-libs'] = await icuLibGlobber.glob()
      core.debug(`To bundle: [${options['bdist-libs'].join(', ')}]`)
      break
    }
  }
}
