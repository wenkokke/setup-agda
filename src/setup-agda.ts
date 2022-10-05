import * as core from '@actions/core'
import setupNightly from './setup-agda/nightly'
import {buildAgda} from './setup-agda/source'

export default async function setupAgda(version: string): Promise<void> {
  try {
    core.info(`Set up Agda version ${version}`)
    if (version === 'nightly') {
      await setupNightly()
    } else {
      await buildAgda(version)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error)
    }
  }
}
