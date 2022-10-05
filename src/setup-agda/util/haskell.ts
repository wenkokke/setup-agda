import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as semver from 'semver'
import * as os from 'os'
import {execOutput, progVersion} from './exec'

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('cabal', args, execOptions)
}

export async function ghc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('ghc', args, execOptions)
}

export async function getGHCVersion(): Promise<string> {
  return progVersion('ghc', {versionFlag: '--numeric-version', silent: true})
}

export async function getCabalVersion(): Promise<string> {
  return progVersion('cabal', {versionFlag: '--numeric-version', silent: true})
}

const ghcVersionTestedWithRegExp = RegExp(
  'GHC == (?<version>\\d+\\.\\d+\\.\\d+)',
  'g'
)

function getCompatibleGhcVersions(cabalFile: string): semver.SemVer[] {
  const packageCabalFileContents = fs.readFileSync(cabalFile).toString()
  const versions = []
  for (const match of packageCabalFileContents.matchAll(
    ghcVersionTestedWithRegExp
  )) {
    if (match.groups !== undefined) {
      const parsedVersion = semver.parse(match.groups.version)
      if (parsedVersion !== null) {
        versions.push(parsedVersion)
      } else {
        core.warning(
          `Could not parse GHC version ${match.groups.version} in ${cabalFile}`
        )
      }
    }
  }
  return versions
}

export function getLatestCompatibleGhcVersion(
  cabalFile: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): string {
  // Get all compatible GHC versions from Cabal file:
  const compatibleGhcVersions = getCompatibleGhcVersions(cabalFile)
  core.info(
    [
      `Found compatible GHC versions:`,
      compatibleGhcVersions.map(ghcVersion => ghcVersion.version).join(', ')
    ].join(os.EOL)
  )
  // Compute the latest satisying GHC version
  const latestCompatibleGhcVersion = semver.maxSatisfying(
    compatibleGhcVersions,
    options?.ghcVersion ?? '*'
  )
  if (latestCompatibleGhcVersion === null) {
    throw Error(`Could not find compatible GHC version`)
  } else {
    return latestCompatibleGhcVersion.version
  }
}
