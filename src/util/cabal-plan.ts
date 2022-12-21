import * as core from '@actions/core'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from '../opts'
import * as util from '../util'

export async function cabalPlanSetup(
  options: opts.BuildOptions
): Promise<void> {
  const cabalPlanVersion = '0.7.2.3'
  options['cabal-plan-version'] = cabalPlanVersion
  const cabalPlanDir = opts.setupAgdaCacheDir(
    path.join('cabal-plan', cabalPlanVersion)
  )
  // Update cabal package index
  await util.cabal(['update'])
  // Install cabal-plan to cabalPlanDir
  await util.mkdirP(cabalPlanDir)
  await util.cabal([
    'install',
    `cabal-plan-${cabalPlanVersion}`,
    '-f+license-report',
    '--ignore-project',
    '--install-method=copy',
    `--installdir=${cabalPlanDir}`,
    '--overwrite-policy=always'
  ])
  // Add the path to the cabal-plan executable to the PATH
  core.addPath(cabalPlanDir)
}

export async function cabalPlanLicenseReport(
  sourceDir: string,
  licenseDir: string
): Promise<void> {
  const execOptions: util.ExecOptions = {cwd: sourceDir}
  for (const component of Object.keys(opts.agdaComponents)) {
    // Get the short name for the component, e.g., Agda:exe:agda -> agda
    const componentShortName = component.split(':').at(-1)

    // Run `cabal-plan license-report`
    core.info(
      `Generate license-report for ${componentShortName} in ${licenseDir}`
    )
    const licenseReportPath = path.join(
      licenseDir,
      `license-report-${componentShortName}.md`
    )
    const {output, errors} = await util.getOutputAndErrors(
      'cabal-plan',
      ['license-report', `--licensedir=${licenseDir}`, component],
      execOptions
    )

    // Write the generated license report and warnings to a separate file:
    fs.writeFileSync(
      licenseReportPath,
      [output, '## Warnings', errors ? errors : 'No warnings'].join(
        `${os.EOL}${os.EOL}`
      )
    )
  }
}
