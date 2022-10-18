import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

export default async function installFromBdist(
  options: opts.BuildOptions
): Promise<string | null> {
  // Download & extract package:
  try {
    const bdistUrl = opts.findPkgUrl('agda', options['agda-version'])
    core.info(`Found package for Agda ${options['agda-version']}`)
    try {
      core.info(`Downloading package from ${bdistUrl}`)
      const bdistZip = await tc.downloadTool(bdistUrl)
      const bdistDir = await tc.extractZip(bdistZip)
      // Try to clean up .zip archive:
      try {
        util.rmRF(bdistZip)
      } catch (error) {
        core.debug(`Could not clean up: ${ensureError(error).message}`)
      }
      // If needed, repair file permissions:
      await repairPermissions(bdistDir)
      // Test package:
      core.info(`Testing Agda ${options['agda-version']} package`)
      try {
        await util.agdaTest({
          agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
          agdaDataDir: path.join(bdistDir, 'data')
        })
        return bdistDir
      } catch (error) {
        const warning = ensureError(error)
        warning.message = `Rejecting Agda ${options['agda-version']} package: ${warning.message}`
        core.warning(warning)
        return null
      }
    } catch (error) {
      core.warning(`Failed to download package: ${ensureError(error).message}`)
      return null
    }
  } catch (error) {
    core.warning(ensureError(error))
    return null
  }
}

async function repairPermissions(bdistDir: string): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      // Repair file permissions
      core.info('Repairing file permissions')
      for (const binName of util.agdaBinNames) {
        await util.chmod('+x', path.join(bdistDir, 'bin', binName))
      }
      break
    }
    case 'macos': {
      // Repair file permissions
      core.info('Repairing file permissions')
      // Repair file permissions on executables
      for (const binName of util.agdaBinNames) {
        await util.chmod('+x', path.join(bdistDir, 'bin', binName))
        await util.xattr('-c', path.join(bdistDir, 'bin', binName))
      }
      // Repair file permissions on libraries
      const libGlobber = await glob.create(path.join(bdistDir, 'lib', '*'))
      for await (const libPath of libGlobber.globGenerator()) {
        await util.chmod('+w', libPath)
        await util.xattr('-c', libPath)
        await util.chmod('-w', libPath)
      }
      break
    }
  }
}
