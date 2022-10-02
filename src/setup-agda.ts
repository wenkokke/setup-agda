import * as core from '@actions/core'
import setupAgdaNightly from './setup-agda/nightly'
import setupAgdaLatest from './setup-agda/latest'
import setupAgdaVersion from './setup-agda/version'
import * as semver from 'semver'

export default async function setupAgda(agdaVersion: string): Promise<void> {
  try {
    core.info(`Set up Agda version ${agdaVersion}`)
    if (agdaVersion === 'nightly') {
      await setupAgdaNightly()
    } else if (agdaVersion === 'latest') {
      await setupAgdaLatest()
    } else {
      const agdaSemVer: semver.SemVer | null = semver.parse(agdaVersion)
      if (agdaSemVer !== null) {
        await setupAgdaVersion(agdaSemVer)
      } else {
        core.setFailed(`Could not parse requested Agda version ${agdaVersion}`)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
