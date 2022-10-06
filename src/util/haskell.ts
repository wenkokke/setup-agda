import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as fs from 'fs'
import * as semver from 'semver'
import * as os from 'os'
import {execOutput, getVersion} from './exec'
import setupHaskell from 'setup-haskell'

export type SetupOptionKey =
  | 'ghc-version'
  | 'cabal-version'
  | 'stack-version'
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'
  | 'disable-matcher'

export const setupOptionKeys: SetupOptionKey[] = [
  'ghc-version',
  'cabal-version',
  'stack-version',
  'enable-stack',
  'stack-no-global',
  'stack-setup-ghc',
  'disable-matcher'
]

export type SetupOptions = Partial<Record<SetupOptionKey, string>>

export async function setup(options?: Readonly<SetupOptions>): Promise<void> {
  // TODO: upstream ghc-version as a semver.Range to setup
  await setupHaskell((options ?? {}) as Record<string, string>)
}

export async function execSystemCabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('cabal', args, execOptions)
}

export async function execSystemGHC(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('ghc', args, execOptions)
}

export async function getSystemGHCVersion(): Promise<string> {
  return getVersion('ghc', {versionFlag: '--numeric-version', silent: true})
}

export async function getSystemCabalVersion(): Promise<string> {
  return getVersion('cabal', {versionFlag: '--numeric-version', silent: true})
}

const compatibleGHCVersionRegExp = RegExp(
  'GHC == (?<version>\\d+\\.\\d+\\.\\d+)',
  'g'
)

function getCompatibleGHCVersions(cabalFile: string): semver.SemVer[] {
  const packageCabalFileContents = fs.readFileSync(cabalFile).toString()
  const versions = []
  for (const match of packageCabalFileContents.matchAll(
    compatibleGHCVersionRegExp
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

export function getLatestCompatibleGHCVersion(
  cabalFile: string,
  ghcVersionRange?: string | semver.Range
): string {
  // Get all compatible GHC versions from Cabal file:
  const compatibleGhcVersions = getCompatibleGHCVersions(cabalFile)
  core.info(
    [
      `Found compatible GHC versions:`,
      compatibleGhcVersions.map(ghcVersion => ghcVersion.version).join(', ')
    ].join(os.EOL)
  )
  // Compute the latest satisying GHC version
  const latestCompatibleGhcVersion = semver.maxSatisfying(
    compatibleGhcVersions,
    ghcVersionRange ?? '*'
  )
  if (latestCompatibleGhcVersion === null) {
    throw Error(`Could not find compatible GHC version`)
  } else {
    return latestCompatibleGhcVersion.version
  }
}
