import * as hackage from '../util/hackage'
import bundledAgdaBdistIndex from '../data/Agda.bdist.json'
import bundledAgdaStdlibSdistIndex from '../data/agda-stdlib.sdist.json'
import bundledAgdaPackageInfoCacheForDeprecatedVersions from '../data/Agda.versions.deprecated.json'
import bundledAgdaPackageInfoCacheForNormalVersions from '../data/Agda.versions.normal.json'
import bundledAgdaToAgdaStdlibCompatibilityMap from '../data/Agda.agda-stdlib-compat.json'
import {Platform, Arch} from './platform'
import assert from 'node:assert'

// Bundled data & derived types:

// Type of Agda versions:
export type AgdaVersion =
  keyof typeof bundledAgdaPackageInfoCacheForNormalVersions.packageInfo

export const agdaVersions = Object.keys(
  bundledAgdaPackageInfoCacheForNormalVersions.packageInfo
) as AgdaVersion[]

// Type guard for Agda versions:
export function isAgdaVersion(version: string): version is AgdaVersion {
  return (agdaVersions as string[]).includes(version)
}

// Type of deprecated Agda versions:
export type AgdaDeprecatedVersion =
  keyof typeof bundledAgdaPackageInfoCacheForDeprecatedVersions.packageInfo

export const agdaDeprecatedVersions = Object.keys(
  bundledAgdaPackageInfoCacheForDeprecatedVersions.packageInfo
) as AgdaVersion[]

// Type guard for deprecated Agda versions:
export function isDeprecatedAgdaVersion(
  version: string
): version is AgdaDeprecatedVersion {
  return (agdaDeprecatedVersions as string[]).includes(version)
}

// Type of Agda git refs:
export type AgdaGitRef = 'HEAD'

// Type guard for Agda git refs:
export function isAgdaGitRef(version: string): version is AgdaGitRef {
  return version === 'HEAD'
}

// Type of Agda version specifications, i.e., valid inputs to the action:
export type AgdaVersionSpec = AgdaVersion | AgdaGitRef | 'latest' | 'nightly'

// Type guard for Agda version specifications:
export function isAgdaVersionSpec(
  versionSpec: string
): versionSpec is AgdaVersionSpec {
  return (
    isAgdaVersion(versionSpec) ||
    isAgdaGitRef(versionSpec) ||
    versionSpec === 'latest' ||
    versionSpec === 'nightly'
  )
}

// Type of agda-stdlib versions:
export type AgdaStdlibVersion = keyof typeof bundledAgdaStdlibSdistIndex

export const agdaStdlibVersions = Object.keys(
  bundledAgdaStdlibSdistIndex
) as AgdaStdlibVersion[]

// Type guard for agda-stdlib versions:
export function isAgdaStdlibVersion(
  version: string
): version is AgdaStdlibVersion {
  return (agdaStdlibVersions as string[]).includes(version)
}

// Type of agda-stdlib version specifications, i.e., valid inputs to the action:
export type AgdaStdlibVersionSpec =
  | AgdaStdlibVersion
  | 'recommended'
  | 'latest'
  | 'experimental'
  | 'none'

// Type guard for agda-stdlib version specifications:
export function isAgdaStdlibVersionSpec(
  versionSpec: string
): versionSpec is AgdaStdlibVersionSpec {
  return (
    isAgdaVersion(versionSpec) ||
    versionSpec === 'recommended' ||
    versionSpec === 'latest' ||
    versionSpec === 'experimental' ||
    versionSpec === 'none'
  )
}

// List of Agda source distributions on Hackage:
export const agdaPackageInfoCache = hackage.mergePackageInfoCache(
  bundledAgdaPackageInfoCacheForDeprecatedVersions as hackage.PackageInfoCache,
  bundledAgdaPackageInfoCacheForNormalVersions as hackage.PackageInfoCache
)

// List of custom Agda binary distributions:
//
// NOTE: The type ensures that all binary distributions are indexed under valid
//       platform, architecture, and Agda version keys.
export type BdistIndexEntry = string | {url: string; dir?: string}

export const agdaBdistIndex: Partial<
  Record<
    Platform,
    Partial<
      Record<Arch, Partial<Record<AgdaVersion | 'nightly', BdistIndexEntry>>>
    >
  >
> = bundledAgdaBdistIndex

// List of agda-stdlib source distributions on GitHub:
//
// NOTE: The type ensures that all source distributions are indexed under valid
//       agda-stdlib version keys.
export const agdaStdlibSdistIndex = bundledAgdaStdlibSdistIndex as Partial<
  Record<AgdaStdlibVersion, string>
>

// The compatibility mapping between Agda versions and agda-stdlib versions:
//
// NOTE: The first type assignment ensures that every Agda version has a
//       list of compatible agda-stdlib version strings, but does not check
//       that those agda-stdlib version strings are valid agda-stdlib versions.
//       The second assignment asserts that they are correct, but does not check it.
const agdaVersionToCompatibleAgdaStdlibVersionStrings: Record<
  AgdaVersion,
  string[]
> = bundledAgdaToAgdaStdlibCompatibilityMap

export const agdaVersionToCompatibleAgdaStdlibVersions =
  agdaVersionToCompatibleAgdaStdlibVersionStrings as Record<
    AgdaVersion,
    AgdaStdlibVersion[]
  >

for (const agdaVersion of agdaVersions)
  for (const agdaStdlibVersionString of agdaVersionToCompatibleAgdaStdlibVersionStrings[
    agdaVersion
  ])
    assert(isAgdaStdlibVersion(agdaStdlibVersionString))

// Inputs for haskell/actions/setup:

export type SetupHaskellOption =
  | 'cabal-version'
  | 'ghc-version'
  | 'stack-version'

export type SetupHaskellFlag =
  | 'disable-matcher'
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'

export interface SetupHaskellInputs
  extends Record<SetupHaskellOption, string>,
    Record<SetupHaskellFlag, boolean> {}

// Inputs for wenkokke/setup-agda:

export type SetupAgdaOption =
  | 'agda-version'
  | 'agda-stdlib-version'
  | 'bdist-name'
  | 'ghc-version-range'
  | 'pre-build-hook'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'bdist-compress-exe'
  | 'bdist-upload'
  | 'force-cluster-counting'
  | 'force-no-cluster-counting'
  | 'force-optimise-heavily'
  | 'force-no-optimise-heavily'
  | 'force-build'
  | 'force-no-build'
  | 'ghc-version-match-exact'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export interface BuildOptions extends SetupAgdaInputs {
  // Type refinements:
  'agda-version': AgdaVersion | 'HEAD' | 'nightly'
  'agda-stdlib-version': AgdaStdlibVersion | 'experimental' | 'none'
  // Additional options:
  'extra-include-dirs': string[]
  'extra-lib-dirs': string[]
  'icu-version'?: string
  'upx-version'?: string
}
