import * as core from '@actions/core'
import setupAgdaNightly from './setup-agda/nightly'
import {AgdaVersionData} from './util/version'

export default async function setupAgda(
  spec?: string | AgdaVersionData
): Promise<void> {
  try {
    core.info(`Set up Agda version ${spec}`)
    if (spec === 'nightly') {
      await setupAgdaNightly()
    } else {
      core.info("Don't know how to build Agda from source.")
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
