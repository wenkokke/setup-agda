import * as core from '@actions/core'
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

  const agdaDirTC = tc.find('agda', options['agda-version'])
  // NOTE: tc.find returns '' if the tool is not found
  if (agdaDirTC === '') {
    core.info(`Could not find cache for Agda ${options['agda-version']}`)
    return null
  } else {
    core.info(`Found cache for Agda ${options['agda-version']}`)
    core.info(`Testing cache for Agda ${options['agda-version']}`)
    try {
      util.agdaTest({
        agdaBin: path.join(agdaDirTC, 'bin', util.agdaBinName),
        agdaDataDir: path.join(agdaDirTC, 'data')
      })
      return agdaDirTC
    } catch (error) {
      const warning = util.ensureError(error)
      warning.message = `Rejecting cached Agda ${options['agda-version']}: ${warning.message}`
      core.warning(warning)
      return null
    }
  }
}
