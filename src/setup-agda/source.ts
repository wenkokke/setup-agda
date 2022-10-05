import * as core from '@actions/core'
import * as path from 'path'
import * as os from 'os'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import {getGHCVersionsTestedWith as getGhcVersionsTestedWith} from '../util/haskell'
import {getPackageSource} from '../util/hackage'

export async function buildAgda(
  agdaVersion: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): Promise<void> {
  // Get the Agda source from Hackage:
  core.info(`Get Agda ${agdaVersion} from Hackage`)
  const sourceDir = await getPackageSource('agda', agdaVersion)
  const agdaCabalFile = path.join(sourceDir, 'Agda.cabal')

  // Select compatible GHC versions:
  const ghcVersion = await selectGHCVersion(agdaVersion, agdaCabalFile, options)
  core.info(`Selected GHC version ${ghcVersion}`)

  // Setup GHC via haskell/actions/setup
  await setupHaskell({'ghc-version': ghcVersion})
}

async function selectGHCVersion(
  agdaVersion: string,
  agdaCabalFile: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): Promise<string> {
  // Get all compatible GHC versions from Agda.cabal
  const compatibleGhcVersions = getGhcVersionsTestedWith(agdaCabalFile)
  core.info(
    [
      `Agda version ${agdaVersion} is compatible with GHC versions:`,
      compatibleGhcVersions.map(ghcVersion => ghcVersion.version).join(', ')
    ].join(os.EOL)
  )
  // Compute the latest satisying GHC version
  const ghcVersion = semver.maxSatisfying(
    compatibleGhcVersions,
    options?.ghcVersion ?? '*'
  )
  if (ghcVersion === null) {
    throw Error(`Could not find compatible GHC version`)
  } else {
    return ghcVersion.version
  }
}
