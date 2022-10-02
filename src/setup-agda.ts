import * as core from '@actions/core'
import * as setupHaskell from './setup-haskell'
import * as semver from 'semver'
import {OS} from './opts'

export default async function setupAgda(
  agdaVersion: string,
  os: OS
): Promise<void> {
  try {
    core.info(`Set up Agda version ${agdaVersion}`)
    if (agdaVersion === 'nightly') {
      await setupAgdaNightly(os)
    } else if (agdaVersion === 'latest') {
      await setupAgdaLatest(os)
    } else {
      const agdaSemVer: semver.SemVer | null = semver.parse(agdaVersion)
      if (agdaSemVer !== null) {
        await setupAgdaVersion(agdaSemVer, os)
      } else {
        core.setFailed(`Could not parse requested Agda version ${agdaVersion}`)
      }
    }
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

async function setupAgdaNightly(os: OS): Promise<void> {
  core.debug(`Setup 'nightly' on ${os}`)
}

async function setupAgdaLatest(os: OS): Promise<void> {
  core.debug(`Setup 'latest' on ${os}`)
}

async function setupAgdaVersion(
  agdaSemVer: semver.SemVer,
  os: OS
): Promise<void> {
  core.debug(`Setup '${agdaSemVer.version}' on ${os}`)
  const ghcVersion = await setupHaskell.ghcVersion()
  core.info(`Found GHC version ${ghcVersion?.version}`)
}
