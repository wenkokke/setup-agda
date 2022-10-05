import * as core from '@actions/core'
import * as path from 'path'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import * as haskell from './util/haskell'
import * as hackage from './util/hackage'
import {execOutput} from './util/exec'

export async function buildAgda(
  agdaVersion: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): Promise<void> {
  // Get the Agda source from Hackage:
  core.info(`Get Agda ${agdaVersion} from Hackage`)
  const sourceDir = await hackage.getPackageSource('Agda', agdaVersion)
  core.info(await execOutput('ls', ['-R', sourceDir]))
  const agdaCabalFile = path.join(sourceDir, 'Agda.cabal')

  // Select compatible GHC versions:
  const ghcVersion = haskell.getLatestCompatibleGhcVersion(
    agdaCabalFile,
    options
  )
  core.info(`Selected GHC version ${ghcVersion}`)

  // Setup GHC via haskell/actions/setup
  await setupHaskell({'ghc-version': ghcVersion})
}
