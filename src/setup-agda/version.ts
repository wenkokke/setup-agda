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
      `Could not resolve Agda version '${agdaVer}' to any known version`
    )
  } else {
    core.info(
      `Resolved version '${agdaVer}' to '${agdaBuilder.version.toString()}'`
    )
    return agdaBuilder
  }
}

async function resolveAndSetupGhcVersion(
  agdaBuilder: AgdaBuilder
): Promise<semver.SemVer> {
  // Find a compatible GHC version:
  let ghcVer = await ghcVersion()
  if (ghcVer !== null && agdaBuilder.testedWith(ghcVer)) {
    core.info(`Found compatible GHC version ${ghcVer.version}`)
    return ghcVer
  } else {
    if (ghcVer !== null) {
      core.info(`Found incompatible GHC version ${ghcVer.version}`)
    }
    ghcVer = agdaBuilder.maxGhcVersionSatisfying()
    if (ghcVer !== null) {
      core.info(`Setting up GHC version ${ghcVer.version}`)
      await setupHaskell({'ghc-version': ghcVer.version})
      return ghcVer
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
  await resolveAndSetupGhcVersion(builder)
}
