import * as path from 'node:path'
import * as opts from './opts'
import * as util from './util'

export default async function setup(
  options: opts.BuildOptions
): Promise<string> {
  const cabalPlanVersion = '0.7.2.3'
  const cabalPlanDir = opts.setupAgdaCacheDir(
    path.join('cabal-plan', cabalPlanVersion)
  )
  // Update cabal package index
  await util.cabal(['update'])
  // Install cabal-plan to cabalPlanDir
  await util.cabal([
    'install',
    `cabal-plan-${cabalPlanVersion}`,
    '-f license-report',
    '--ignore-project',
    '--install-method=copy',
    `--installdir=${cabalPlanDir}`,
    '--overwrite-policy=always'
  ])
  // Return the path to the cabal-plan executable:
  return opts.platform === 'win32'
    ? path.join(cabalPlanDir, 'cabal-plan.exe')
    : path.join(cabalPlanDir, 'cabal-plan')
}
