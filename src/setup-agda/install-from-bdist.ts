import * as core from '@actions/core'
import * as glob from '@actions/glob'
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
    const bdistIndexEntry =
      opts.agdaBdistIndex?.[opts.platform]?.[opts.arch]?.[
        options['agda-version']
      ]
    if (bdistIndexEntry === undefined) {
      core.info(
        [
          `Could not find binary distribution for`,
          `Agda ${options['agda-version']} on ${opts.arch}-${opts.platform}`
        ].join(' ')
      )
      return null
    }
    try {
      const bdistDir = await opts.downloadDist(bdistIndexEntry)
      // If needed, repair file permissions:
      await repairPermissions(bdistDir)
      // Test package:
      core.info(`Testing Agda ${options['agda-version']} package`)
      try {
        await util.agdaTest({
          agdaExePath: path.join(
            bdistDir,
            'bin',
            opts.agdaComponents['Agda:exe:agda'].exe
          ),
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
      for (const component of Object.values(opts.agdaComponents)) {
        await util.chmod('+x', path.join(bdistDir, 'bin', component.exe))
      }
      break
    }
    case 'darwin': {
      // Repair file permissions
      core.info('Repairing file permissions')
      // Repair file permissions on executables
      for (const component of Object.values(opts.agdaComponents)) {
        await util.chmod('+x', path.join(bdistDir, 'bin', component.exe))
        await util.xattr('-c', path.join(bdistDir, 'bin', component.exe))
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
