import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

// Helper to install from GitHub Runner tool cache

// NOTE: We can hope, can't we?

export default async function installFromToolCache(
  options: opts.BuildOptions
): Promise<string | null> {
  // If 'agda-version' is 'HEAD' we must build from source:
  if (options['agda-version'] === 'HEAD') return null
  // If 'agda-version' is 'nightly' we must install from bdist:
  if (options['agda-version'] === 'nightly') return null

  const agdaDirTC = tc.find('agda', options['agda-version'])
  // NOTE: tc.find returns '' if the tool is not found
  if (agdaDirTC === '') {
    util.logging.info(
      `Could not find cache for Agda ${options['agda-version']}`
    )
    return null
  } else {
    util.logging.info(`Found cache for Agda ${options['agda-version']}`)
    util.logging.info(`Testing cache for Agda ${options['agda-version']}`)
    try {
      util.agdaTest({
        agdaExePath: path.join(
          agdaDirTC,
          'bin',
          opts.agdaComponents['Agda:exe:agda'].exe
        ),
        agdaDataDir: path.join(agdaDirTC, 'data')
      })
      return agdaDirTC
    } catch (error) {
      const warning = util.ensureError(error)
      warning.message = `Rejecting cached Agda ${options['agda-version']}: ${warning.message}`
      util.logging.warning(warning)
      return null
    }
  }
}
