import * as core from '@actions/core'
import * as opts from './opts'
import * as exec from './util/exec'

export default async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Otherwise, setup ICU:
  let icuVersion = undefined
  switch (opts.os) {
    case 'windows': {
      // Install pkg-config and icu
      core.addPath('C:\\msys64\\mingw64\\bin')
      core.addPath('C:\\msys64\\usr\\bin')
      await exec.execOutput('pacman', [
        '--noconfirm',
        '-S',
        'mingw-w64-x86_64-pkgconfig',
        'mingw-w64-x86_64-icu'
      ])
      // Get the icu-i18n version via pkg-config:
      icuVersion = await exec.execOutput('pkgconfig', [
        '--modversion',
        'icu-i18n'
      ])
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
      // which is recent enough for 'text-icu' to compile:
      core.exportVariable(
        'PKG_CONFIG_PATH',
        '/usr/local/opt/icu4c/lib/pkgconfig'
      )
      // Get the icu-i18n version via pkg-config:
      icuVersion = await exec.execOutput('pkg-config', [
        '--modversion',
        'icu-i18n'
      ])
      break
    }
  }
  return {...options, 'icu-version': icuVersion}
}
