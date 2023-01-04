import * as hackage from '../util/deps/hackage'
import bundledAgdaInfo from '../data/Agda.json'
import bundledAgdaStdlibInfo from '../data/agda-stdlib.json'
import bundledAgdaPackageInfoCacheForDeprecatedVersions from '../data/Agda.versions.deprecated.json'
import bundledAgdaPackageInfoCacheForNormalVersions from '../data/Agda.versions.normal.json'
import bundledAgdaComponentsMap from '../data/Agda.components.json'
import {platform, Platform, Arch} from './platform'

// Bundled data & derived types:

// Type of Agda components:

export type AgdaComponent = keyof typeof bundledAgdaComponentsMap

// Values of Agda components:

export const agdaComponents: Record<
  AgdaComponent,
  Record<'exe', string>
> = bundledAgdaComponentsMap

// Windows: add .exe extension
if (platform === 'win32')
  for (const component of Object.keys(agdaComponents))
    agdaComponents[component as AgdaComponent].exe += '.exe'

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
export type AgdaStdlibVersion = keyof typeof bundledAgdaStdlibInfo

export const agdaStdlibVersions = Object.keys(
  bundledAgdaStdlibInfo
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
    isAgdaStdlibVersion(versionSpec) ||
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

// Type of distributions.
export type DistType = 'zip' | 'tgz' | 'txz' | 'git'

// Type of distributions, e.g., zip files or Git repositories.
export type Dist =
  | string
  | {url: string; dir?: string; tag?: string; distType?: DistType}

export type AgdaInfo = Record<
  AgdaVersion | 'nightly',
  {
    binary: Partial<Record<Platform, Partial<Record<Arch, Dist[]>>>>
    compatibility: {
      'agda-stdlib': string
    }
  }
>

// For each Agda version:
// - A list of all binary distributions
// - A list of compatible agda-stdlib versions
export const agdaInfo: AgdaInfo = bundledAgdaInfo

// List of agda-stdlib source distributions on GitHub:
//
// NOTE: The type ensures that all source distributions are indexed under valid
//       agda-stdlib version keys.
export const agdaStdlibInfo = bundledAgdaStdlibInfo as Partial<
  Record<AgdaStdlibVersion | 'experimental', {source: Dist}>
>

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
  | 'agda-libraries'
  | 'agda-defaults'
  | 'agda-executables'
  | 'bdist-name'
  | 'bdist-retention-days'
  | 'ghc-version-range'
  | 'pre-build-hook'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'agda-stdlib-default'
  | 'bdist-compress-exe'
  | 'bdist-license-report'
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
  // Type refinements of 'agda-version' and 'agda-stdlib-version':
  'agda-version': AgdaVersion | 'HEAD' | 'nightly'
  'agda-stdlib-version': AgdaStdlibVersion | 'experimental' | 'none'
  // Libraries: paths to libraries that need to be added to AGDA_DIR/libraries:
  'agda-libraries-list-local': string[]
  // Libraries: distribution information for libraries that need to be installed and added to AGDA_DIR/libraries:
  'agda-libraries-list-sdist': Dist[]
  // Libraries: names of libraries that need to be added to AGDA_DIR/defaults
  'agda-libraries-default': string[]
  // Executables: paths of executables that need to be added to AGDA_DIR/executables
  'agda-executables-list': string[]
  // Extra include and lib directories for compiling Agda:
  'extra-include-dirs': string[]
  'extra-lib-dirs': string[]
  // Versions of other software:
  'icu-version'?: string
  'upx-version'?: string
  'cabal-plan-version'?: string
}
