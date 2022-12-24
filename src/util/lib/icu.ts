import * as opts from '../../opts'
import * as path from 'node:path'
import * as http from 'node:http'
import * as fs from 'node:fs'
import {
  setupForLinux as icuSetupForLinux,
  bundleForLinux as icuBundleForLinux
} from './icu/linux'
import {
  setupForMacOS as icuSetupForMacOS,
  bundleForMacOS as icuBundleForMacOS
} from './icu/macos'
import {
  setupForWindows as icuSetupForWindows,
  bundleForWindows as icuBundleForWindows
} from './icu/windows'
import {mkdirP} from '../exec'
import {pipeline} from 'node:stream/promises'

export async function icuSetup(options: opts.BuildOptions): Promise<void> {
  switch (opts.platform) {
    case 'linux':
      return await icuSetupForLinux(options)
    case 'darwin':
      return await icuSetupForMacOS(options)
    case 'win32':
      return await icuSetupForWindows(options)
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

export async function icuBundle(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.platform) {
    case 'linux':
      return await icuBundleForLinux(distDir, options)
    case 'darwin':
      return await icuBundleForMacOS(distDir, options)
    case 'win32':
      return await icuBundleForWindows(distDir, options)
  }
}

export async function icuGetLicense(
  licenseDir: string,
  options: opts.BuildOptions
): Promise<{icuName: string; icuLicensePath: string}> {
  if (options['icu-version'] === undefined)
    throw Error(`Could not download license: no ICU version specified`)

  // Transform the ICU version, e.g., "71.1_1", to something we can use in the URL, such as "71-1"
  const icuVersion = options['icu-version']
    .trim()
    .split('_')[0]
    .replace('.', '-')
  const licenseUrl = `http://raw.githubusercontent.com/unicode-org/icu/release-${icuVersion}/icu4c/LICENSE`

  // Create the license directory:
  const icuName = `icu-${icuVersion}`
  const icuLicenseDir = path.join(licenseDir, icuName)
  const icuLicensePath = path.join(icuLicenseDir, 'LICENSE')
  await mkdirP(icuLicenseDir)

  // Download the license file:
  await new Promise<void>((resolve, reject) => {
    http.get(licenseUrl, async (res: http.IncomingMessage): Promise<void> => {
      const {statusCode} = res
      if (statusCode === 200) {
        await pipeline(res, fs.createWriteStream(icuLicensePath))
        resolve()
      } else {
        reject(Error(`Could not download license: ${res.errored?.message}`))
      }
    })
  })
  return {icuName, icuLicensePath}
}
