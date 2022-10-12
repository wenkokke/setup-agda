import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as opts from './opts'
import * as exec from './util/exec'
import * as path from 'path'

export default async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Otherwise, setup ICU:
  let icuVersion = undefined
  let icuLibsToBundle: string[] = []
  switch (opts.os) {
    case 'windows': {
      // Install pkg-config and ICU
      core.addPath('C:\\msys64\\mingw64\\bin')
      core.addPath('C:\\msys64\\usr\\bin')
      await exec.execOutput('pacman', [
        '-v',
        '--noconfirm',
        '-Sy',
        'mingw-w64-x86_64-pkg-config',
        'mingw-w64-x86_64-icu'
      ])
      // Get the icu-i18n version via pacman:
      icuVersion = await exec.execOutput('pacman', [
        '--noconfirm',
        '-Qs',
        'mingw-w64-x86_64-icu'
      ])
      icuVersion =
        icuVersion.match(/(?<version>\d[\d.]+\d)/)?.groups?.version ??
        icuVersion

      // Get the ICU libraries to bundle:
      const icuLibDir = 'C:\\msys64\\mingw64\\bin'
      const icuLibGlobber = await glob.create(path.join(icuLibDir, 'icu*.dll'))
      icuLibsToBundle = await icuLibGlobber.glob()
      break
    }
    case 'linux': {
      // Ubuntu 20.04 ships with a recent version of ICU
      // Get the icu-i18n version via pkg-config:
      icuVersion = await exec.execOutput('pkg-config', [
        '--modversion',
        'icu-i18n'
      ])
      break
    }
    case 'macos': {
      // The GitHub runner for MacOS 11+ has ICU version 69.1,
      // which is recent enough for 'text-icu' to compile.

      // Get the icu prefix
      const icuPrefix = await exec.execOutput('brew', ['--prefix', 'icu4c'])
      const icuLibDir = path.join(icuPrefix, 'lib')
      const icuPkgConfigDir = path.join(icuLibDir, 'pkgconfig')
      core.exportVariable('PKG_CONFIG_PATH', icuPkgConfigDir)

      // Get the icu-i18n version via pkg-config:
      icuVersion = await exec.execOutput('pkg-config', [
        '--modversion',
        'icu-i18n'
      ])

      // Get the ICU libraries to bundle:
      const icuLibGlobber = await glob.create(path.join(icuLibDir, '*.dylib'))
      icuLibsToBundle = await icuLibGlobber.glob()
      break
    }
  }
  return {
    ...options,
    'icu-version': icuVersion,
    'libs-to-bundle': [...options['libs-to-bundle'], ...icuLibsToBundle]
  }
}
