import * as core from '@actions/core'
import * as opts from './opts'
import * as exec from './util/exec'

export default async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Otherwise, setup ICU:
  switch (opts.os) {
    case 'windows': {
      // Install pkg-config and icu
      core.addPath('C:\\msys64\\mingw64\\bin')
      core.addPath('C:\\msys64\\usr\\bin')
      await exec.execOutput('pacman', [
        '--noconfirm',
        '-S',
        'mingw-w64-x86_64-pkg-config',
        'mingw-w64-x86_64-icu'
      ])
      break
    }
    case 'linux': {
      // Ubuntu 20.04 ships with a recent version of ICU
      break
    }
    case 'macos': {
      // The GitHub runner for MacOS 11+ has ICU version 69.1,
      // which is recent enough for 'text-icu' to compile:
      core.exportVariable(
        'PKG_CONFIG_PATH',
        '/usr/local/opt/icu4c/lib/pkgconfig'
      )
      break
    }
  }
  // Get the icu-i18n version via pkg-config:
  return {
    ...options,
    'icu-version': await exec.execOutput('pkg-config', [
      '--modversion',
      'icu-i18n'
    ])
  }
}
