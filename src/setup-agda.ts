import * as core from '@actions/core'
import {yamlInputs} from './opts'
import setupNightly from './setup-agda/download-nightly'
import {buildAgda} from './setup-agda/build-from-source'

export default async function setupAgda(
  options?: Record<string, string>
): Promise<void> {
  try {
    const agdaVersion =
      options?.['agda-version'] ?? yamlInputs['agda-version'].default
    core.info(`Set up Agda version ${agdaVersion}`)
    if (agdaVersion === 'nightly') {
      await setupNightly()
    } else {
      await buildAgda(agdaVersion)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error)
    }
  }
}
