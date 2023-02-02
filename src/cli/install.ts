import glob from 'glob'
import fs from 'fs-extra'
import * as path from 'node:path'
import { agdaInstallDir } from '../util/appdirs.js'
import download from '../util/download-helper.js'
import { arch, platform } from '../util/platform.js'
import { agdaComponents, agdaInfo, InstallOptions } from '../util/types.js'
import test from './test.js'
import chmod from '../util/deps/chmod.js'
import xattr from '../util/deps/xattr.js'
import ensureError from 'ensure-error'
import {
  AgdaInstallDirExists,
  AgdaRejectedAllDists,
  AgdaRejectedDist
} from '../util/errors.js'

export default async function install(options: InstallOptions): Promise<void> {
  // Find a binary distribution:
  const agdaDists = agdaInfo[options['agda-version']].binary?.[platform]?.[arch]
  if (agdaDists === undefined || agdaDists.length === 0)
    throw Error(`Could not find a binary distribution for ${arch}-${platform}`)

  // Download binary distribution:
  for (const agdaDist of agdaDists) {
    try {
      const tmpDir = await download(agdaDist)

      // Repair permissions:
      await repairPermissions(tmpDir)

      // Test binary distribution:
      logger.debug(`Testing binary distribution`)
      try {
        const agdaExeName = agdaComponents['Agda:exe:agda'].exe
        const agdaExePath = path.join(tmpDir, 'bin', agdaExeName)
        const agdaDataDir = path.join(tmpDir, 'data')
        await test({ agdaPath: agdaExePath, agdaDataDir })
      } catch (error) {
        throw new AgdaRejectedDist(
          options['agda-version'],
          agdaDist,
          ensureError(error)
        )
      }

      // Copy binary distribution to install directory:
      const dest = options.dest ?? agdaInstallDir(options['agda-version'])
      if (fs.existsSync(dest)) throw new AgdaInstallDirExists(dest)
      await fs.mkdirp(path.dirname(dest))
      await fs.copy(tmpDir, dest)
      return
    } catch (error) {
      logger.warning(
        new AgdaRejectedDist(
          options['agda-version'],
          agdaDist,
          ensureError(error)
        )
      )
      continue
    }
  }
  // All Agda distributions have failed:
  throw new AgdaRejectedAllDists(options['agda-version'])
}

async function repairPermissions(distDir: string): Promise<void> {
  switch (platform) {
    // Linux: Mark executables as executable
    case 'linux': {
      for (const component of Object.values(agdaComponents)) {
        logger.debug(`Repair permissions for ${component.exe}`)
        await chmod(['+x', path.join(distDir, 'bin', component.exe)])
      }
      break
    }
    // macOS: Mark executables as executable & clear all extended attributes
    case 'macos': {
      for (const component of Object.values(agdaComponents)) {
        await chmod(['+x', path.join(distDir, 'bin', component.exe)])
        await xattr(['-c', path.join(distDir, 'bin', component.exe)])
      }
      // NOTE: Ensure libraries are writable before clearing extended attributes
      const libPaths = glob.sync(path.join(distDir, 'lib', '*'))
      for (const libPath of libPaths) {
        await chmod(['+w', libPath])
        await xattr(['-c', libPath])
        await chmod(['-w', libPath])
      }
      break
    }
  }
}
