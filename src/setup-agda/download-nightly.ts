import * as core from '@actions/core'
import * as io from '@actions/io'
import * as toolCache from '@actions/tool-cache'
import assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as opts from '../opts'
import * as agda from '../util/agda'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyUrlDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyUrlWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

export default async function setupAgdaNightly(): Promise<void> {
  core.info(`Setup 'nightly' on ${opts.platform}`)
  switch (opts.platform) {
    case 'linux': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlLinux)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.installDir}`)
      await io.mkdirP(opts.installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        opts.installDir,
        [
          '--extract',
          '--xz',
          '--preserve-permissions',
          '--strip-components=1',
          '--exclude=check_agda.sh',
          '--exclude=install_emacs_mode.sh'
        ]
      )

      // Configure Agda:
      assert(
        opts.installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${opts.installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      core.exportVariable('Agda_datadir', path.join(opts.installDir, 'data'))
      core.addPath(path.join(opts.installDir, 'bin'))
      break
    }
    case 'darwin': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlDarwin}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlDarwin)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.installDir}`)
      await io.mkdirP(opts.installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        opts.installDir,
        [
          '--extract',
          '--xz',
          '--preserve-permissions',
          '--strip-components=1',
          '--exclude=check_agda.sh',
          '--exclude=install_emacs_mode.sh'
        ]
      )

      // Configure Agda:
      assert(
        opts.installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${opts.installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      core.exportVariable('Agda_datadir', path.join(opts.installDir, 'data'))
      core.addPath(path.join(opts.installDir, 'bin'))
      break
    }
    case 'win32': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlWin32}`)
      const agdaNightlyZip = await toolCache.downloadTool(nightlyUrlWin32)
      const {mtime} = fs.statSync(agdaNightlyZip)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.cacheDir}`)
      await io.mkdirP(opts.cacheDir)
      const cacheDirTC = await toolCache.extractZip(
        agdaNightlyZip,
        opts.cacheDir
      )

      // Copy extracted files to installDir:
      core.info(`Move nightly build to ${opts.installDir}`)
      const agdaCacheDirTC = path.join(cacheDirTC, 'Agda-nightly')
      await io.mkdirP(opts.installDir)
      await io.mv(path.join(agdaCacheDirTC, 'bin'), opts.installDir)
      await io.mv(path.join(agdaCacheDirTC, 'data'), opts.installDir)
      await io.rmRF(agdaCacheDirTC)
      break
    }
  }
  // Configure Agda:
  core.exportVariable('Agda_datadir', path.join(opts.installDir, 'data'))
  core.addPath(path.join(opts.installDir, 'bin'))

  // Test Agda installation:
  await agda.testSystemAgda()
}
