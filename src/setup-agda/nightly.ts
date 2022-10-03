import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as toolCache from '@actions/tool-cache'
import * as process from 'process'
import * as opts from '../opts'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyUrlDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyUrlWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

// core.toPlatformPath

function lsR(dir: string): void {
  let output = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    }
  }
  exec.exec('ls', ['-R', dir], options)
  core.info(output)
}

export default async function setupAgdaNightly(): Promise<void> {
  const platform = process.platform as opts.Platform
  core.info(`Setup 'nightly' on ${platform}`)
  switch (platform) {
    case 'linux': {
      core.info(`Download nightly build to ${opts.downloadDir}`)
      io.mkdirP(opts.downloadDir)
      const downloadDir = await toolCache.downloadTool(
        nightlyUrlLinux,
        opts.downloadDir
      )
      lsR(downloadDir)
      core.info(`Extract nightly build to ${opts.installDir}`)
      io.mkdirP(opts.installDir)
      const installDir = await toolCache.extractTar(
        core.toPlatformPath(`${downloadDir}/Agda-nightly-linux.tar.xz`),
        opts.installDir
      )
      lsR(downloadDir)
      core.info(`Extracted to ${installDir}`)
      exec.exec('ls', ['-R', installDir])
      break
    }
    case 'darwin': {
      core.info(`Download nightly build to ${opts.downloadDir}`)
      const downloadDir = await toolCache.downloadTool(
        nightlyUrlDarwin,
        opts.downloadDir
      )
      core.info(`Finished download: ${downloadDir}`)
      const installDir = await toolCache.extractTar(
        downloadDir,
        opts.installDir
      )
      core.info(`Extracted to ${installDir}`)
      exec.exec(`ls -R ${installDir}`)
      break
    }
    case 'win32': {
      core.info(`Download nightly build to ${opts.downloadDir}`)
      const downloadDir = await toolCache.downloadTool(
        nightlyUrlWin32,
        opts.downloadDir
      )
      core.info(`Finished download: ${downloadDir}`)
      const installDir = await toolCache.extractZip(
        downloadDir,
        opts.installDir
      )
      core.info(`Extracted to ${installDir}`)
      exec.exec(`dir ${installDir}`)
      break
    }
  }
}
