import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as toolCache from '@actions/tool-cache'
import assert from 'assert'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import * as config from '../util/config'
import {agdaTest} from '../util/agda'

const nightlyUrlLinux =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-linux.tar.xz'
const nightlyUrlDarwin =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-macOS.tar.xz'
const nightlyUrlWin32 =
  'https://github.com/agda/agda/releases/download/nightly/Agda-nightly-win64.zip'

export default async function setupAgdaNightly(): Promise<void> {
  core.info(`Setup 'nightly' on ${config.platform}`)
  switch (config.platform) {
    case 'linux': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlLinux}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlLinux)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${config.installDir}`)
      await io.mkdirP(config.installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        config.installDir,
        ['--extract', '--xz', '--preserve-permissions', '--strip-components=1']
      )

      // Configure Agda:
      assert(
        config.installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${config.installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      core.exportVariable('Agda_datadir', path.join(config.installDir, 'data'))
      core.addPath(path.join(config.installDir, 'bin'))
      break
    }
    case 'darwin': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlDarwin}`)
      const agdaNightlyTar = await toolCache.downloadTool(nightlyUrlDarwin)
      const {mtime} = fs.statSync(agdaNightlyTar)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${config.installDir}`)
      await io.mkdirP(config.installDir)
      const installDirTC = await toolCache.extractTar(
        agdaNightlyTar,
        config.installDir,
        ['--extract', '--xz', '--preserve-permissions', '--strip-components=1']
      )

      // Configure Agda:
      assert(
        config.installDir === installDirTC,
        [
          'Wrong installation directory:',
          `Expected ${config.installDir}`,
          `Actual ${installDirTC}`
        ].join(os.EOL)
      )
      core.exportVariable('Agda_datadir', path.join(config.installDir, 'data'))
      core.addPath(path.join(config.installDir, 'bin'))
      break
    }
    case 'win32': {
      // Download archive:
      core.info(`Download nightly build from ${nightlyUrlWin32}`)
      const agdaNightlyZip = await toolCache.downloadTool(nightlyUrlWin32)
      const {mtime} = fs.statSync(agdaNightlyZip)
      core.info(`Nighly build last modified at ${mtime.toUTCString()}`)

      // Extract archive:
      core.info(`Extract nightly build to ${config.cacheDir}`)
      await io.mkdirP(config.cacheDir)
      const cacheDirTC = await toolCache.extractZip(
        agdaNightlyZip,
        config.cacheDir
      )

      // Copy extracted files to installDir:
      core.info(`Copy nightly build to ${config.installDir}`)
      const agdaCacheDirTC = path.join(cacheDirTC, 'Agda-nightly')
      const globber = await glob.create(`${agdaCacheDirTC}/**`, {
        implicitDescendants: false,
        matchDirectories: false
      })
      for await (const file of globber.globGenerator()) {
        core.info(`Copy file ${file}`)
        const relativeFile = path.relative(agdaCacheDirTC, file)
        core.info(`- relative file path: ${relativeFile}`)
        const relativeDir = path.dirname(relativeFile)
        core.info(`- relative directory: ${relativeDir}`)
        await io.mkdirP(path.join(config.installDir, relativeDir))
        core.info(`cp ${file} ${path.join(config.installDir, relativeFile)}`)
        await io.cp(file, path.join(config.installDir, relativeFile))
      }
      break
    }
  }
  // Configure Agda:
  core.exportVariable('Agda_datadir', path.join(config.installDir, 'data'))
  core.addPath(path.join(config.installDir, 'bin'))

  // Test Agda installation:
  await agdaTest()
}
