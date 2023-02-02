import glob from 'glob'
import fs from 'fs-extra'
import * as http from 'node:http'
import * as os from 'node:os'
import * as path from 'node:path'
import { pipeline } from 'node:stream/promises'
import exec, { ExecOptions } from '../exec.js'
import { BuildOptions } from '../types.js'

// TODO: edit ExecOptions.env.PATH instead of passing cabalPlanPath

const cabalPlanWarningPattern =
  /WARNING: license files for (?<depName>\S+) \(global\/GHC bundled\) not copied/

// Guess the URL at which the package _might_ store its license.
const hackageLicenseUrl = (slug: string): string =>
  `http://hackage.haskell.org/package/${slug}/src/LICENSE`

const cabalPlan = {
  /** Check whether `cabal-plan` should be setup. */
  needed: (options: BuildOptions): boolean => {
    return options['bundle-options']?.['bundle-license-report'] ?? false
  },
  getLicenses: async (
    cabalPlanPath: string | null,
    source: string,
    components: string[],
    licenseDir: string,
    options?: ExecOptions
  ): Promise<Partial<Record<string, string>>> => {
    // If cabalPlan was not provided, assume it is on the PATH:
    // TODO: Throw a user-friendly error if cabal-plan is not found on the PATH
    cabalPlanPath = cabalPlanPath ?? 'cabal-plan'

    // Initialise options & set CWD
    options = options ?? {}
    options.cwd = source

    const licenses: Partial<Record<string, string>> = {}
    for (const component of components) {
      // Run `cabal-plan license-report` and save the licenses to $licenseDir:
      const { stderr } = await exec(
        cabalPlanPath,
        ['license-report', `--licensedir=${licenseDir}`, component],
        { ...options, stderr: true }
      )
      // Read the generated licenses, and add them to $licenses:
      for (const depLicensePath of glob.sync(path.join(licenseDir, '*', '*'))) {
        const depName = path.basename(path.dirname(depLicensePath))
        licenses[depName] = depLicensePath
      }
      // Process the warnings and download the missing licenses:
      const errorMessages = stderr
        .split(os.EOL)
        .map((errorMessage) => errorMessage.trim())
      for (const errorMessage of errorMessages) {
        const warningMatch = errorMessage.match(cabalPlanWarningPattern)
        const depName = warningMatch?.groups?.depName
        if (depName !== undefined) {
          const depLicenseUrl = hackageLicenseUrl(depName)
          await new Promise<void>((resolve, reject) => {
            http.get(
              depLicenseUrl,
              async (res: http.IncomingMessage): Promise<void> => {
                const { statusCode } = res
                if (statusCode === 200) {
                  const depLicensePath = path.join(
                    licenseDir,
                    depName,
                    'LICENSE'
                  )
                  await fs.mkdirp(path.join(licenseDir, depName))
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
          if (errorMessage) logger.warning(`cabal-plan: ${errorMessage}`)
        }
      }
    }
    // Return the licenses
    return licenses
  }
}

export default cabalPlan
