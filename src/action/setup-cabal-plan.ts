import path from 'node:path'
import { setupAgdaCacheDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import { mkdirP } from '../util/exec.js'
import { platform } from '../util/platform.js'
import * as semver from 'semver'
import ghc from '../util/deps/ghc.js'
import { BuildOptions } from '../util/types.js'

const version = '0.7.2.3'

const ghcVersionConstraint = '>=8.2.1'

/** Check whether `cabal-plan` should be setup. */
function needed(options: BuildOptions): boolean {
  return options['license-report']
}

/**
 * Check whether to setup `cabal-plan` before or after calling `setup-haskell`.
 *
 * If neither the current nor the requested GHC version satisfies the version
 * constraints for `cabal-plan`, throw an error.
 *
 * @throws Error
 */
run.when = async (
  options: BuildOptions
): Promise<'not-needed' | 'before-setup-haskell' | 'after-setup-haskell'> => {
  if (needed(options)) {
    const ghcVersion = await ghc.maybeGetVersion()
    if (ghcVersion !== null)
      if (semver.satisfies(ghcVersion, ghcVersionConstraint))
        return 'before-setup-haskell'
    if (semver.satisfies(options['ghc-version'], '>=8.2.1'))
      return 'after-setup-haskell'
    throw Error(`Cannot setup cabal-plan: requires GHC ${ghcVersionConstraint}`)
  } else {
    return 'not-needed'
  }
}

/** Install `cabal-plan`. */
export default async function run(): Promise<string> {
  // Check the GHC version:
  const ghcVersion = await ghc.maybeGetVersion()
  if (ghcVersion === null || semver.lt(ghcVersion, '8.2.1'))
    throw Error('setup-cabal-plan requires GHC >=8.2.1')

  // Install `cabal-plan` with `license-report`:
  const cabalPlanDir = setupAgdaCacheDir(path.join('cabal-plan', version))
  logger.info(`Install cabal-plan ${version} to ${cabalPlanDir}`)
  await cabal(['v2-update'])
  await mkdirP(cabalPlanDir)
  await cabal([
    'v2-install',
    `cabal-plan-${version}`,
    '-f+license-report',
    '--ignore-project',
    '--install-method=copy',
    `--installdir=${cabalPlanDir}`,
    '--overwrite-policy=always'
  ])
  // Return the path to the cabal-plan executable:
  return platform === 'win32'
    ? path.join(cabalPlanDir, 'cabal-plan.exe')
    : path.join(cabalPlanDir, 'cabal-plan')
}
