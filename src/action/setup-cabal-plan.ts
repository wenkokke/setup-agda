import * as cache from '@actions/cache'
import * as path from 'node:path'
import { setupAgdaCacheDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import { mkdirP } from '../util/exec.js'
import { platform, release } from '../util/platform.js'
import * as semver from 'semver'
import ghc from '../util/deps/ghc.js'
import { BuildOptions } from '../util/types.js'
import cabalPlan from '../util/deps/cabal-plan.js'
import { GhcNotFound, GhcVersionMismatch } from '../util/errors.js'
import ensureError from 'ensure-error'

const version = '0.7.2.3'
const installDir = setupAgdaCacheDir(path.join('cabal-plan', version))
const primaryKey = `cabal-plan-${version}-${platform}-${release}`
const ghcVersionConstraint = '>=8.2.1'
const cabalPlanExe =
  platform === 'windows'
    ? path.join(installDir, 'cabal-plan.exe')
    : path.join(installDir, 'cabal-plan')

setupCabalPlan.restoreCache = async (): Promise<string | null> => {
  // Check the cache for cabal-plan:
  if (!cache.isFeatureAvailable()) return null
  const cacheHit = await cache.restoreCache([installDir], primaryKey)
  if (cacheHit === undefined) return null
  return cabalPlanExe
}

setupCabalPlan.saveCache = async (): Promise<void> => {
  if (!cache.isFeatureAvailable()) return
  await cache.saveCache([installDir], primaryKey)
}

/** Install `cabal-plan`. */
export default async function setupCabalPlan(): Promise<string> {
  // Check the GHC version:
  const currentGhcVersion = await ghc.maybeGetVersion()
  assertGhcVersionOk(currentGhcVersion)

  // Install `cabal-plan` with `license-report`:
  logger.info(`Install cabal-plan ${version} to ${installDir}`)
  await cabal(['v2-update'])
  await mkdirP(installDir)
  await cabal([
    'v2-install',
    `cabal-plan-${version}`,
    '-f+license-report',
    '--ignore-project',
    '--install-method=copy',
    `--installdir=${installDir}`,
    '--overwrite-policy=always'
  ])
  // Return the path to the cabal-plan executable:
  return cabalPlanExe
}

/**
 * Check whether to setup `cabal-plan` before or after calling `setup-haskell`.
 *
 * If neither the current nor the requested GHC version satisfies the version
 * constraints for `cabal-plan`, throw an error.
 *
 * @throws GhcNotFound
 * @throws GhcVersionMismatch
 */
setupCabalPlan.when = async (
  options: BuildOptions
): Promise<'not-needed' | 'before-setup-haskell' | 'after-setup-haskell'> => {
  if (!cabalPlan.needed(options)) {
    return 'not-needed'
  } else {
    const currentGhcVersion = await ghc.maybeGetVersion()
    try {
      assertGhcVersionOk(currentGhcVersion)
      return 'before-setup-haskell'
    } catch (error) {
      if (error instanceof GhcNotFound || error instanceof GhcVersionMismatch) {
        assertGhcVersionOk(options['ghc-version'])
        return 'after-setup-haskell'
      } else {
        throw ensureError(error)
      }
    }
  }
}

function assertGhcVersionOk(ghcVersion: string | null): void | never {
  if (ghcVersion === null) {
    throw new GhcNotFound('cabal-plan', version, ghcVersionConstraint)
  } else if (!semver.satisfies(ghcVersion, ghcVersionConstraint)) {
    throw new GhcVersionMismatch(
      'cabal-plan',
      version,
      ghcVersionConstraint,
      ghcVersion
    )
  } else {
    return
  }
}
