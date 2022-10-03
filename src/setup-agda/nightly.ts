import * as core from '@actions/core'
import * as io from '@actions/io'
import * as exec from '@actions/exec'
import * as toolCache from '@actions/tool-cache'
import * as process from 'process'
import * as opts from '../opts'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
// const nightlyUrlDarwin =
//   'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
// const nightlyUrlWin32 =
//   'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

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
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const nightlyPathLinux = await toolCache.downloadTool(nightlyUrlLinux)

      core.info(`Extract nightly build to ${opts.installDir}`)
      io.mkdirP(opts.installDir)
      const installDir = await toolCache.extractTar(
        nightlyPathLinux,
        opts.installDir,
        ['--extract', '--xz', '--preserve-permissions', '--strip-components=1']
      )
      lsR(installDir)
      break
    }
    case 'darwin': {
      break
    }
    case 'win32': {
      break
    }
  }
}
