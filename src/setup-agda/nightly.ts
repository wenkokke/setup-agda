import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as toolCache from '@actions/tool-cache'
import * as os from 'os'
import * as opts from '../opts'

const nightlyLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

// core.toPlatformPath

export default async function setupAgdaNightly(): Promise<void> {
  const platform = os.platform() as opts.Platform
  core.debug(`Setup 'nightly' on ${platform}`)
  switch (platform) {
    case 'linux': {
      core.debug(`Download nightly build to ${opts.downloadDir}`)
      const nightlyLinuxPath = await toolCache.downloadTool(
        nightlyLinux,
        opts.downloadDir
      )
      const installDir = await toolCache.extractTar(
        nightlyLinuxPath,
        opts.installDir
      )
      core.info(`Extracted to ${installDir}`)
      exec.exec(`ls -R ${installDir}`)
      break
    }
    case 'darwin': {
      core.debug(`Download nightly build to ${opts.downloadDir}`)
      const nightlyDarwinPath = await toolCache.downloadTool(
        nightlyDarwin,
        opts.downloadDir
      )
      const installDir = await toolCache.extractTar(
        nightlyDarwinPath,
        opts.installDir
      )
      core.info(`Extracted to ${installDir}`)
      exec.exec(`ls -R ${installDir}`)
      break
    }
    case 'win32': {
      core.debug(`Download nightly build to ${opts.downloadDir}`)
      const nightlyWin32Path = await toolCache.downloadTool(
        nightlyWin32,
        opts.downloadDir
      )
      const installDir = await toolCache.extractZip(
        nightlyWin32Path,
        opts.installDir
      )
      core.info(`Extracted to ${installDir}`)
      exec.exec(`dir ${installDir}`)
      break
    }
  }
}
