import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from '../opts'
import gmpLicense from '../data/licenses/gmp'
import zlibLicense from '../data/licenses/zlib'
import * as util from '../util'

export default async function licenseReport(
  cabalPlan: string,
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
  await util.cabalPlanLicenseReport(cabalPlan, sourceDir, licenseDir)

  // Generate a single LICENSE file:
  const licenseFile = path.join(licenseDir, 'licenses.txt')
  const licenseFileWriteStream = fs.createWriteStream(licenseFile, {flags: 'a'})
  // 1. Append the Agda license to $licenseFile:
  const agdaLicenseFileSource = path.join(sourceDir, 'LICENSE')
  const agdaLicenseReadStream = fs.createReadStream(agdaLicenseFileSource)
  agdaLicenseReadStream.pipe(licenseFileWriteStream, {end: false})
  // 2. Append the license for every other dependency to $licenseFile:
  const licenseGlobber = await glob.create(path.join(licenseDir, '*', '*'))
  for await (const depLicenseFile of licenseGlobber.globGenerator()) {
    const depName = path.basename(path.dirname(depLicenseFile))
    licenseFileWriteStream.write(os.EOL)
    licenseFileWriteStream.write(os.EOL)
    licenseFileWriteStream.write(
      '--------------------------------------------------------------------------------'
    )
    licenseFileWriteStream.write(os.EOL)
    licenseFileWriteStream.write(os.EOL)
    licenseFileWriteStream.write(depName)
    licenseFileWriteStream.write(os.EOL)
    const depLicenseReadStream = fs.createReadStream(depLicenseFile)
    depLicenseReadStream.pipe(licenseFileWriteStream, {end: false})
  }
  // 3. Close licenseFileWriteStream
  licenseFileWriteStream.end()
  // 4. Write the Agda license to $licenseDir/Agda-$agdaVersion/LICENSE
  util.logging.info(`Copy Agda license to ${licenseDir}`)
  const agdaLicenseDir = path.join(
    licenseDir,
    `Agda-${options['agda-version']}`
  )
  const agdaLicenseFileTarget = path.join(agdaLicenseDir, 'LICENSE')
  await util.mkdirP(agdaLicenseDir)
  await util.cp(agdaLicenseFileSource, agdaLicenseFileTarget)
}
