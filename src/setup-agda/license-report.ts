import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from '../opts'
import gmpLicense from '../data/licenses/gmp'
import zlibLicense from '../data/licenses/zlib'
import * as util from '../util'

export default async function licenseReport(
  sourceDir: string,
  installDir: string,
  options: opts.BuildOptions
): Promise<void> {
  // Create the license directory:
  const licenseDir = path.join(installDir, 'licenses')
  await util.mkdirP(licenseDir)

  // Copy the gmp license to $licenseDir/gmp/LICENSE:
  const gmpLicenseDir = path.join(licenseDir, 'gmp')
  const gmpLicenseFile = path.join(gmpLicenseDir, 'LICENSE')
  await util.mkdirP(gmpLicenseDir)
  fs.writeFileSync(gmpLicenseFile, gmpLicense)

  // Copy the zlib license to $licenseDir/zlib/LICENSE:
  const zlibLicenseDir = path.join(licenseDir, 'zlib')
  const zlibLicenseFile = path.join(zlibLicenseDir, 'LICENSE')
  await util.mkdirP(zlibLicenseDir)
  fs.writeFileSync(zlibLicenseFile, zlibLicense)

  // Copy the ICU license to $licenseDir/icu-$icuVersion/LICENSE:
  if (opts.needsIcu(options)) await util.icuWriteLicense(licenseDir, options)

  // Run `cabal-plan license-report` to create a report of the licenses of Agda dependencies:
  await util.cabalPlanLicenseReport(sourceDir, licenseDir)

  // Generate a single LICENSE file:
  const licenseFile = path.join(licenseDir, 'licenses.txt')
  // 1. Append the Agda license to $licenseFile:
  const agdaLicense = fs.readFileSync(path.join(sourceDir, 'LICENSE'))
  fs.appendFileSync(licenseFile, agdaLicense)
  // 2. Append the license for every other dependency to $licenseFile:
  const licenseGlobber = await glob.create(path.join(licenseDir, '*', '*'))
  for await (const depLicenseFile of licenseGlobber.globGenerator()) {
    const depName = path.basename(path.dirname(depLicenseFile))
    const depLicense = fs.readFileSync(licenseFile)
    fs.appendFileSync(licenseFile, `${os.EOL}${depName}${os.EOL}${depLicense}`)
  }
  // 3. Write the Agda license to $licenseDir/Agda-$agdaVersion/LICENSE
  core.info(`Copy Agda license to ${licenseDir}`)
  const agdaLicenseDir = path.join(
    licenseDir,
    `Agda-${options['agda-version']}`
  )
  const agdaLicenseFile = path.join(agdaLicenseDir, 'LICENSE')
  await util.mkdirP(agdaLicenseDir)
  fs.writeFileSync(agdaLicenseFile, agdaLicense)
}
