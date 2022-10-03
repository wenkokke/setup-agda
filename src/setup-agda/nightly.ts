import * as core from '@actions/core'
import * as io from '@actions/io'
import * as glob from '@actions/glob'
import * as toolCache from '@actions/tool-cache'
import * as process from 'process'
import * as opts from '../opts'
import {agdaCompile, agdaDataDir, agdaVersion} from './utils'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
// const nightlyUrlDarwin =
//   'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
// const nightlyUrlWin32 =
//   'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

// core.toPlatformPath

// function lsR(dir: string): void {
//   let output = ''
//   const options: exec.ExecOptions = {}
//   options.listeners = {
//     stdout: (data: Buffer) => {
//       output += data.toString()
//     }
//   }
//   exec.exec('ls', ['-R', dir], options)
//   core.info(output)
// }

async function testAgda(): Promise<void> {
  const pathToAgda = await io.which('agda')
  core.info(`Found Agda on PATH at ${pathToAgda}`)
  const versionString = await agdaVersion()
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await agdaDataDir()
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    core.toPlatformPath(`${dataDir}/lib/prim/**/*.agda`)
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compile ${agdaFile}`)
    await agdaCompile(['-v2', agdaFile])
  }
}

export default async function setupAgdaNightly(): Promise<void> {
  const platform = process.platform as opts.Platform
  core.info(`Setup 'nightly' on ${platform}`)
  switch (platform) {
    case 'linux': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const nightlyPathLinux = await toolCache.downloadTool(nightlyUrlLinux)

      // Extract archive:
      core.info(`Extract nightly build to ${opts.installDir}`)
      io.mkdirP(opts.installDir)
      const installDir = await toolCache.extractTar(
        nightlyPathLinux,
        opts.installDir,
        ['--extract', '--xz', '--preserve-permissions', '--strip-components=1']
      )

      // Configure Agda:
      core.exportVariable('Agda_datadir', `${installDir}/data`)
      core.addPath(`${installDir}/bin`)

      // Test Agda:
      await testAgda()
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
