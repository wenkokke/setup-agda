import * as core from '@actions/core'
import {ghcVersion} from '../setup-haskell'
import * as semver from 'semver'
import {
  resolveAgdaVersion,
  AgdaVersionParts,
  AgdaBuilder
} from '../util/version'

export async function resolveGhcVersion(
  agdaBuilder: AgdaBuilder
): Promise<{version: semver.SemVer; setup: boolean}> {
  // Find a compatible GHC version:
  let version = await ghcVersion()
  if (version !== null && agdaBuilder.isTestedWithGhcVersion(version)) {
    core.info(`Found compatible GHC version ${version.version}`)
    return {version, setup: false}
  } else {
    if (version !== null) {
      core.info(`Found incompatible GHC version ${version.version}`)
    }
    version = agdaBuilder.maxGhcVersionSatisfying()
    if (version !== null) {
      core.info(`Setting up GHC version ${version.version}`)
      return {version, setup: true}
    } else {
      throw Error(
        `Could not find compatible GHC version for Agda ${agdaBuilder.version.toString()}`
      )
    }
  }
}

export default async function setupAgdaVersion(
  versionStringOrParts?: string | AgdaVersionParts
): Promise<void> {
  const builder = resolveAgdaVersion(versionStringOrParts)
  // const {version, setup} =
  await resolveGhcVersion(builder)
  // if (setup) {
  //   await setupHaskell({'ghc-version': version.version})
  // }
}
