import * as core from '@actions/core'
import {ghcVersion, setupHaskell} from '../setup-haskell'
import * as semver from 'semver'
import {
  findBuilder,
  AgdaVersion,
  AgdaVersionParts,
  AgdaBuilder
} from '../util/version'

function resolveAgdaVersion(
  versionStringOrParts?: string | AgdaVersionParts
): AgdaBuilder {
  // Parse the version specification
  let agdaVer: AgdaVersion | undefined
  if (versionStringOrParts !== undefined && versionStringOrParts !== 'latest') {
    agdaVer = new AgdaVersion(versionStringOrParts)
  }

  // Find the appropriate builder:
  const agdaBuilder = findBuilder(agdaVer)
  if (agdaBuilder === null) {
    throw Error(
      `Could not resolve Agda version '${versionStringOrParts}' to any known version`
    )
  } else {
    core.info(
      `Resolved version '${versionStringOrParts}' to '${agdaBuilder.version.toString()}'`
    )
    return agdaBuilder
  }
}

export async function resolveGhcVersion(
  agdaBuilder: AgdaBuilder
): Promise<{version: semver.SemVer; setup: boolean}> {
  // Find a compatible GHC version:
  let version = await ghcVersion()
  if (version !== null && agdaBuilder.testedWith(version)) {
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
  const {version, setup} = await resolveGhcVersion(builder)
  if (setup) {
    await setupHaskell({'ghc-version': version.version})
  }
}
