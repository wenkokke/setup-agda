import * as core from '@actions/core'
import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {pipeline} from 'node:stream/promises'
import gmpLicense from '../data/licenses/gmp'
import icuLicense from '../data/licenses/icu'
import zlibLicense from '../data/licenses/zlib'
import * as opts from '../opts'
import * as util from '../util'

export default async function licenseReport(
  cabalPlan: string,
  sourceDir: string,
  installDir: string,
  options: opts.BuildOptions
): Promise<void> {
  // Create the license cache directory:
  const agdaWithVersion = `Agda-${options['agda-version']}`
  const agdaCacheDir = opts.setupAgdaCacheDir(agdaWithVersion)
  const licenseCacheDir = path.join(agdaCacheDir, 'licenses')
  await util.mkdirP(licenseCacheDir)

  // Write licenses.txt:
  const licensesTxt = path.join(installDir, 'licenses.txt')
  const licensesTxtAppendStream = async (rs: fs.ReadStream): Promise<void> =>
    await pipeline(rs, fs.createWriteStream(licensesTxt, {flags: 'a'}))
  const depHeader = (depName: string): string =>
    ['', '-'.repeat(80), '', depName, ''].join(os.EOL)

  // 1. Append the Agda license to $licenseFile:
  const agdaLicensePath = path.join(sourceDir, 'LICENSE')
  await licensesTxtAppendStream(fs.createReadStream(agdaLicensePath))

  // 2. Append the licenses of the Haskell dependencies:
  const cabalPlanLicenses = await util.cabalPlanGetLicenses(
    cabalPlan,
    sourceDir,
    Object.keys(opts.agdaComponents),
    licenseCacheDir
  )
  for (const [depName, depLicensePath] of Object.entries(cabalPlanLicenses)) {
    assert(depLicensePath !== undefined)
    fs.appendFileSync(licensesTxt, depHeader(depName))
    await licensesTxtAppendStream(fs.createReadStream(depLicensePath))
  }

  // 3. Add the gmp license
  fs.appendFileSync(licensesTxt, depHeader('gmp'))
  fs.appendFileSync(licensesTxt, gmpLicense)

  // 4. Add the icu license
  if (opts.needsIcu(options)) {
    try {
      const {icuName, icuLicensePath} = await util.icuGetLicense(
        licenseCacheDir,
        options
      )
      fs.appendFileSync(licensesTxt, depHeader(icuName))
      await licensesTxtAppendStream(fs.createReadStream(icuLicensePath))
    } catch (error) {
      core.warning(util.ensureError(error))
      fs.appendFileSync(licensesTxt, depHeader('icu'))
      fs.appendFileSync(licensesTxt, icuLicense)
    }
  }

  // 5. Add the zlib license
  fs.appendFileSync(licensesTxt, depHeader('zlib'))
  fs.appendFileSync(licensesTxt, zlibLicense)
}
