import * as core from '@actions/core'
import * as io from '@actions/io'
import * as toolCache from '@actions/tool-cache'
import assert from 'assert'
import * as process from 'process'
import * as opts from '../opts'
import {agdaTest, lsR} from './utils'
import * as os from 'os'
import * as fs from 'fs'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyUrlDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyUrlWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

export default async function setupAgdaNightly(): Promise<void> {
  const platform = process.platform as opts.Platform
  core.info(`Setup 'nightly' on ${platform}`)

  // Each platform will set their own installDir
  // (which should be equivalent to opts.installDir)
  let installDir = ''
  switch (platform) {
    case 'linux': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlLinux)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.installDir}`)
      io.mkdirP(opts.installDir)
      installDir = await toolCache.extractTar(agdaNightlyTar, opts.installDir, [
        '--extract',
        '--xz',
        '--preserve-permissions',
        '--strip-components=1'
      ])

      // Configure Agda:
      core.exportVariable('Agda_datadir', `${installDir}/data`)
      core.addPath(`${installDir}/bin`)
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
      io.mkdirP(opts.installDir)
      installDir = await toolCache.extractTar(agdaNightlyTar, opts.installDir, [
        '--extract',
        '--xz',
        '--preserve-permissions',
        '--strip-components=1'
      ])

      // Configure Agda:
      core.exportVariable('Agda_datadir', `${installDir}/data`)
      core.addPath(`${installDir}/bin`)
      break
    }
    case 'win32': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlWin32}`)
      const agdaNightlyZip = await toolCache.downloadTool(nightlyUrlWin32)
      const {mtime} = fs.statSync(agdaNightlyZip)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.installDir}`)
      io.mkdirP(opts.installDir)
      installDir = await toolCache.extractZip(agdaNightlyZip, opts.installDir)
      break
    }
  }
  // Configure Agda:
  assert(
    installDir === opts.installDir,
    [
      'Wrong installation directory:',
      `Expected ${opts.installDir}`,
      `Actual ${installDir}`
    ].join(os.EOL)
  )
  core.exportVariable('Agda_datadir', core.toPlatformPath(`${installDir}/data`))
  core.addPath(core.toPlatformPath(`${installDir}/bin`))
  core.info(await lsR(installDir))

  // Test Agda installation:
  await agdaTest()
}
