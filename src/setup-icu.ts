import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as opts from './opts'
import * as util from './util'
import * as path from 'node:path'
import * as fs from 'node:fs'
import icuLicense from './data/licenses/icu'
import {setupForLinux, bundleForLinux} from './setup-icu/linux'
import {setupForMacOS, bundleForMacOS} from './setup-icu/macos'
import {setupForWindows, bundleForWindows} from './setup-icu/windows'
import assert from 'node:assert'

export async function setup(options: opts.BuildOptions): Promise<void> {
  switch (opts.platform) {
    case 'linux':
      return await setupForLinux(options)
    case 'darwin':
      return await setupForMacOS(options)
    case 'win32':
      return await setupForWindows(options)
  }
}

// NOTE: This module hardcodes a number of assumptions about libicu which may
//       not always be true, e.g., library name starts with 'libicu', binaries
//       are linked against the major version on Linux and Windows but against
//       the entire version on MacOS, the internal dependencies of ICU, etc.

// NOTE: This module could be rewritten to be much closer to 'repairwheel' by
//       maintaining a list of allowed libraries (like 'manylinux') and using
//       `dumpbin`, `patchelf` and `otool` to find and bundle *all* libraries
//       that aren't on that list.

export async function bundle(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.platform) {
    case 'linux':
      return await bundleForLinux(distDir, options)
    case 'darwin':
      return await bundleForMacOS(distDir, options)
    case 'win32':
      return await bundleForWindows(distDir, options)
  }
}

export async function license(
  licenseDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined)
    throw Error(`Cannot download license: no ICU version specified`)

  // Create the ICU license directory:
  const icuLicenseDir = path.join(licenseDir, `icu-${options['icu-version']}`)
  const icuLicenseFile = path.join(icuLicenseDir, `LICENSE`)
  await util.mkdirP(icuLicenseDir)

  // Transform the ICU version, e.g., "71.1_1", to something we can use in the URL, such as "71-1"
  const icuVersion = options['icu-version']
    .trim()
    .split('_')[0]
    .replace('.', '-')
  const licenseUrl = `https://raw.githubusercontent.com/unicode-org/icu/release-${icuVersion}/icu4c/LICENSE`

  // Download the license file:
  try {
    const icuLicenseFileTC = await tc.downloadTool(licenseUrl, icuLicenseFile)
    assert(
      icuLicenseFile === icuLicenseFileTC,
      `downloadTool saved license to ${icuLicenseFileTC}, not ${icuLicenseFile}`
    )
  } catch (error) {
    // If anything goes wrong, write the backup license:
    core.warning(util.ensureError(error))
    fs.writeFileSync(icuLicenseFile, icuLicense)
  }
}
