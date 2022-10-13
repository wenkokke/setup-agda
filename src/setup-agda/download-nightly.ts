import * as core from '@actions/core'
import * as io from '../util/io'
import * as toolCache from '@actions/tool-cache'
import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../opts'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyUrlDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyUrlWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

export default async function setupAgdaNightly(): Promise<string> {
  core.info(`Setup 'nightly' on ${opts.os}`)
  const installDir = opts.installDir('nightly')
  switch (opts.os) {
    case 'linux': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlLinux)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${installDir}`)
      await io.mkdirP(installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        installDir,
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
        installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      return installDir
    }
    case 'macos': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlDarwin}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlDarwin)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${installDir}`)
      await io.mkdirP(installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        installDir,
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
        installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      return installDir
    }
    case 'windows': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlWin32}`)
      const agdaNightlyZip = await toolCache.downloadTool(nightlyUrlWin32)
      const {mtime} = fs.statSync(agdaNightlyZip)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build`)
      const cacheDirTC = await toolCache.extractZip(agdaNightlyZip)

      // Copy extracted files to installDir:
      core.info(`Move nightly build to ${installDir}`)
      const agdaCacheDirTC = path.join(cacheDirTC, 'Agda-nightly')
      await io.mkdirP(installDir)
      await io.mv(path.join(agdaCacheDirTC, 'bin'), installDir)
      await io.mv(path.join(agdaCacheDirTC, 'data'), installDir)
      await io.rmRF(agdaCacheDirTC)
      break
    }
  }
  return installDir
}
