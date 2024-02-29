import * as path from 'node:path'
import fs from 'fs-extra'
import { agdaupCacheDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import { platform } from '../util/platform.js'
import setupHaskell from './setup-haskell.js'

const version = '0.7.3.0'
const installDir = agdaupCacheDir(path.join('cabal-plan', version))
const ghcVersion = '9.4'
const cabalVersion = '3.8'
const cabalPlanExe =
  platform === 'windows'
    ? path.join(installDir, 'cabal-plan.exe')
    : path.join(installDir, 'cabal-plan')

/** Install `cabal-plan`. */
export default async function setupCabalPlan(): Promise<string> {
  // Setup GHC and Cabal:
  await setupHaskell({
    'ghc-version': ghcVersion,
    'cabal-version': cabalVersion
  })

  // Install `cabal-plan` with `license-report`:
  logger.info(`Install cabal-plan ${version} to ${installDir}`)
  await cabal(['v2-update'])
  await fs.mkdirp(installDir)
  await cabal([
    'v2-install',
    `cabal-plan-${version}`,
    '-f+exe',
    '-f+license-report',
    '--ignore-project',
    '--install-method=copy',
    `--installdir=${installDir}`,
    '--overwrite-policy=always'
  ])
  // Return the path to the cabal-plan executable:
  return cabalPlanExe
}
