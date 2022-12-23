import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from '../../opts'
import * as logging from '../logging'
import {cabal} from './haskell'
import {ExecOptions, getOutputAndErrors, mkdirP} from '../exec'

export async function cabalPlanSetup(
  options: opts.BuildOptions
): Promise<string> {
  const cabalPlanVersion = '0.7.2.3'
  options['cabal-plan-version'] = cabalPlanVersion
  const cabalPlanDir = opts.setupAgdaCacheDir(
    path.join('cabal-plan', cabalPlanVersion)
  )
  logging.info(`Install cabal-plan ${cabalPlanVersion} to ${cabalPlanDir}`)
  // Update cabal package index
  await cabal(['update'])
  // Install cabal-plan to cabalPlanDir
  await mkdirP(cabalPlanDir)
  await cabal([
    'install',
    `cabal-plan-${cabalPlanVersion}`,
    '-f+license-report',
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

export async function cabalPlanLicenseReport(
  cabalPlan: string,
  sourceDir: string,
  licenseDir: string
): Promise<void> {
  const execOptions: ExecOptions = {cwd: sourceDir}
  for (const component of Object.keys(opts.agdaComponents)) {
    // Get the short name for the component, e.g., Agda:exe:agda -> agda
    const componentShortName = component.split(':').at(-1)

    // Run `cabal-plan license-report`
    logging.info(
      `Generate license-report for ${componentShortName} in ${licenseDir}`
    )
    const licenseReportPath = path.join(
      licenseDir,
      `license-report-${componentShortName}.md`
    )
    const {output, errors} = await getOutputAndErrors(
      cabalPlan,
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
