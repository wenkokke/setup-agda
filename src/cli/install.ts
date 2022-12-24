import * as glob from '@actions/glob'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import {agdaInstallDir} from '../opts/appdirs'
import downloadDist from '../opts/download-dist'
import {arch, platform} from '../opts/platform'
import resolveAgdaVersion from '../opts/resolve-agda-version'
import {
  agdaComponents,
  agdaInfo,
  AgdaVersionSpec,
  isAgdaVersion
} from '../opts/types'
import {agdaTest} from '../util/deps/agda'
import {chmod} from '../util/deps/chmod'
import {xattr} from '../util/deps/xattr'
import ensureError from '../util/ensure-error'
import {cpR, mkdirP, rmRF} from '../util/exec'
import * as logging from '../util/logging'

export default async function install(
  agdaVersion?: AgdaVersionSpec
): Promise<void> {
  // If the argument is not an exact version, e.g., "2.6" or "latest",
  // resolve the Agda version:
  agdaVersion = agdaVersion ?? 'latest'
  if (!isAgdaVersion(agdaVersion)) {
    agdaVersion = resolveAgdaVersion(agdaVersion ?? 'latest')
    logging.debug(`Resolved Agda version to ${agdaVersion}`)
  }

  // Find a binary distribution:
  const agdaDists =
    agdaVersion === 'HEAD'
      ? undefined // NOTE: There is never a binary distribution for HEAD
      : agdaInfo[agdaVersion].binary?.[platform]?.[arch]
  if (!agdaDists)
    // Either undefined or empty
    throw Error(`Could not find a binary distribution for ${arch}-${platform}`)

  // Download binary distribution:
  for (const agdaDist of agdaDists) {
    try {
      const tmpDistDir = await downloadDist(agdaDist)

      // Repair permissions:
      await repairPermissions(tmpDistDir)

      // Test binary distribution:
      logging.debug(`Testing binary distribution`)
      try {
        const agdaExeName = agdaComponents['Agda:exe:agda'].exe
        const agdaExePath = path.join(tmpDistDir, 'bin', agdaExeName)
        const agdaDataDir = path.join(tmpDistDir, 'data')
        await agdaTest({agdaExePath, agdaDataDir})
      } catch (error) {
        const fatal = ensureError(error)
        fatal.message = `Rejected binary distribution: ${fatal.message}`
        throw fatal
      }

      // Copy binary distribution to install directory:
      const dest = agdaInstallDir(agdaVersion)
      if (fs.existsSync(dest))
        throw Error(`Installation directory exists: ${dest}`)
      await mkdirP(path.dirname(dest))
      await cpR(tmpDistDir, dest)

      // Clean up temporary directory:
      try {
        await rmRF(tmpDistDir)
      } catch (error) {
        const warning = ensureError(error)
        logging.warning(`Could not clean up: ${warning.message}`)
      }
      return
    } catch (error) {
      const fatal = ensureError(error)
      const agdaDistUrl = typeof agdaDist === 'string' ? agdaDist : agdaDist.url
      logging.warning(`Rejected ${agdaDistUrl}${os.EOL}${fatal.message}`)
      continue
    }
  }
  // All Agda distributions have failed:
  throw Error(`Could not setup Agda ${agdaVersion}`)
}

async function repairPermissions(distDir: string): Promise<void> {
  switch (platform) {
    // Linux: Mark executables as executable
    case 'linux': {
      for (const component of Object.values(agdaComponents)) {
        logging.debug(`Repair permissions for ${component.exe}`)
        await chmod('+x', path.join(distDir, 'bin', component.exe))
      }
      break
    }
    // macOS: Mark executables as executable & clear all extended attributes
    case 'darwin': {
      for (const component of Object.values(agdaComponents)) {
        await chmod('+x', path.join(distDir, 'bin', component.exe))
        await xattr('-c', path.join(distDir, 'bin', component.exe))
      }
      // NOTE: Ensure libraries are writable before clearing extended attributes
      const libGlobber = await glob.create(path.join(distDir, 'lib', '*'))
      for await (const libPath of libGlobber.globGenerator()) {
        await chmod('+w', libPath)
        await xattr('-c', libPath)
        await chmod('-w', libPath)
      }
      break
    }
  }
}
