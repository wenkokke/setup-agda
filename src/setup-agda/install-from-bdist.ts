import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'
import * as logging from '../util/logging'

export default async function installFromBdist(
  options: opts.BuildOptions
): Promise<string | null> {
  // If 'agda-version' is 'HEAD' we must build from source:
  if (options['agda-version'] === 'HEAD') return null

  // Download & extract package:
  try {
    const bdistIndexEntries =
      opts.agdaInfo[options['agda-version']].binary?.[opts.platform]?.[
        opts.arch
      ]
    if (bdistIndexEntries === undefined || bdistIndexEntries.length === 0) {
      logging.info(
        [
          `Could not find binary distribution for`,
          `Agda ${options['agda-version']} on ${opts.arch}-${opts.platform}`
        ].join(' ')
      )
      return null
    }
    // Try and download each binary distribution in order:
    let bdistDir: string | undefined
    for (const bdistIndexEntry of bdistIndexEntries) {
      try {
        bdistDir = await opts.downloadDist(bdistIndexEntry)
        break
      } catch (error) {
        logging.debug(util.ensureError(error).message)
        bdistDir = undefined // Reset to undefined
        continue
      }
    }
    // If we failed to download any distribution, fail:
    if (bdistDir === undefined) {
      logging.error(`Failed to download all binary distributions`)
      return null
    } else {
      try {
        // If needed, repair file permissions:
        await repairPermissions(bdistDir)
        // Test package:
        logging.info(`Testing Agda ${options['agda-version']} package`)
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
          logging.warning(warning)
          return null
        }
      } catch (error) {
        const errorMessage = util.ensureError(error).message
        logging.error(`Failed to setup binary distribution: ${errorMessage}`)
        return null
      }
    }
  } catch (error) {
    logging.warning(util.ensureError(error))
    return null
  }
}

async function repairPermissions(bdistDir: string): Promise<void> {
  switch (opts.platform) {
    case 'linux': {
      // Repair file permissions
      logging.info('Repairing file permissions')
      for (const component of Object.values(opts.agdaComponents)) {
        await util.chmod('+x', path.join(bdistDir, 'bin', component.exe))
      }
      break
    }
    case 'darwin': {
      // Repair file permissions
      logging.info('Repairing file permissions')
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
