import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

export default async function installFromBdist(
  options: opts.BuildOptions
): Promise<string | null> {
  // If 'agda-version' is 'HEAD' we must build from source:
  if (options['agda-version'] === 'HEAD') return null

  // Download & extract package:
  try {
    const bdistUrl =
      opts.agdaBdistIndex?.[opts.platform]?.[opts.arch]?.[
        options['agda-version']
      ]
    if (bdistUrl === undefined) {
      core.info(
        [
          `Could not find binary distribution for`,
          `Agda ${options['agda-version']} on ${opts.arch}-${opts.platform}`
        ].join(' ')
      )
      return null
    }
    try {
      core.info(`Downloading package from ${bdistUrl}`)
      const bdistZip = await tc.downloadTool(bdistUrl)
      const bdistDir = await tc.extractZip(bdistZip)
      // Try to clean up .zip archive:
      try {
        util.rmRF(bdistZip)
      } catch (error) {
        core.info(`Could not clean up: ${util.ensureError(error).message}`)
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
        const warning = util.ensureError(error)
        warning.message = `Rejecting Agda ${options['agda-version']} package: ${warning.message}`
        core.warning(warning)
        return null
      }
    } catch (error) {
      core.warning(
        `Failed to download package: ${util.ensureError(error).message}`
      )
      return null
    }
  } catch (error) {
    core.warning(util.ensureError(error))
    return null
  }
}

async function repairPermissions(bdistDir: string): Promise<void> {
  switch (opts.platform) {
    case 'linux': {
      // Repair file permissions
      core.info('Repairing file permissions')
      for (const binName of util.agdaBinNames) {
        await util.chmod('+x', path.join(bdistDir, 'bin', binName))
      }
      break
    }
    case 'darwin': {
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
