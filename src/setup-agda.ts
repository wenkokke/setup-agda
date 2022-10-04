import * as core from '@actions/core'
import setupAgdaNightly from './setup-agda/nightly'
import setupAgdaVersion from './setup-agda/version'
import {AgdaVersionParts} from './util/version'

export default async function setupAgda(
  spec?: string | AgdaVersionParts
): Promise<void> {
  try {
    core.info(`Set up Agda version ${spec}`)
    if (spec === 'nightly') {
      await setupAgdaNightly()
    } else {
      await setupAgdaVersion(spec)
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
