import * as glob from '@actions/glob'
import * as fs from 'node:fs'
import * as http from 'node:http'
import * as os from 'node:os'
import * as path from 'node:path'
import {pipeline} from 'node:stream/promises'
import * as opts from '../../opts'
import {ExecOptions, getOutputAndErrors, mkdirP} from '../exec'
import * as logging from '../logging'
import {cabal} from './haskell'

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

const cabalPlanWarningPattern =
  /WARNING: license files for (?<depName>\S+) \(global\/GHC bundled\) not copied/

// Guess the URL at which the package _might_ store its license.
const hackageLicenseUrl = (slug: string): string =>
  `http://hackage.haskell.org/package/${slug}/src/LICENSE`

export async function cabalPlanGetLicenses(
  cabalPlan: string,
  sourceDir: string,
  components: string[],
  licenseDir: string
): Promise<Partial<Record<string, string>>> {
  const execOptions: ExecOptions = {cwd: sourceDir}
  const licenses: Partial<Record<string, string>> = {}
  for (const component of components) {
    // Run `cabal-plan license-report` and save the licenses to $licenseDir:
    const {errors} = await getOutputAndErrors(
      cabalPlan,
      ['license-report', `--licensedir=${licenseDir}`, component],
      execOptions
    )
    // Read the generated licenses, and add them to $licenses:
    const licenseGlobber = await glob.create(path.join(licenseDir, '*', '*'))
    for (const depLicensePath of await licenseGlobber.glob()) {
      const depName = path.basename(path.dirname(depLicensePath))
      licenses[depName] = depLicensePath
    }
    // Process the warnings and download the missing licenses:
    const errorMessages = errors
      .split(os.EOL)
      .map(errorMessage => errorMessage.trim())
    for (const errorMessage of errorMessages) {
      const warningMatch = errorMessage.match(cabalPlanWarningPattern)
      const depName = warningMatch?.groups?.depName
      if (depName !== undefined) {
        const depLicenseUrl = hackageLicenseUrl(depName)
        await new Promise<void>((resolve, reject) => {
          http.get(
            depLicenseUrl,
            async (res: http.IncomingMessage): Promise<void> => {
              const {statusCode} = res
              if (statusCode === 200) {
                const depLicensePath = path.join(licenseDir, depName, 'LICENSE')
                await mkdirP(path.join(licenseDir, depName))
                await pipeline(res, fs.createWriteStream(depLicensePath))
                licenses[depName] = depLicensePath
                resolve()
              } else {
                reject(Error(`Could not get license for ${depName}`))
              }
            }
          )
        })
      } else {
        // If we cannot match the cabal-plan error, we print it:
        if (errorMessage) logging.warning(`cabal-plan: ${errorMessage}`)
      }
    }
  }
  // Return the licenses
  return licenses
}
