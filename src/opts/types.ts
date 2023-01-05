import * as hackage from '../util/deps/hackage'
import bundledAgdaInfo from '../data/Agda.json'
import bundledAgdaStdlibInfo from '../data/agda-stdlib.json'
import bundledAgdaPackageInfoCacheForDeprecatedVersions from '../data/Agda.versions.deprecated.json'
import bundledAgdaPackageInfoCacheForNormalVersions from '../data/Agda.versions.normal.json'
import bundledAgdaComponentsMap from '../data/Agda.components.json'
import {platform, Platform, Arch} from './platform'

// Agda Components

/** The type of Agda components. */
export type AgdaComponent = keyof typeof bundledAgdaComponentsMap

/** A dictionary mapping each Agda component to its corresponding executable name. */
export const agdaComponents: Record<
  AgdaComponent,
  Record<'exe', string>
> = bundledAgdaComponentsMap

// On Windows: add .exe extension
if (platform === 'win32')
  for (const component of Object.keys(agdaComponents))
    agdaComponents[component as AgdaComponent].exe += '.exe'

// Agda Normal Versions

/** The type of Agda versions. */
export type AgdaVersion =
  keyof typeof bundledAgdaPackageInfoCacheForNormalVersions.packageInfo

/** A list of all Agda versions. */
export const agdaVersions = Object.keys(
  bundledAgdaPackageInfoCacheForNormalVersions.packageInfo
) as AgdaVersion[]

/** A type guard for Agda versions. */
export function isAgdaVersion(version: string): version is AgdaVersion {
  return (agdaVersions as string[]).includes(version)
}

// Agda Deprecated Versions

/** The type of deprecated Agda versions. */
export type AgdaDeprecatedVersion =
  keyof typeof bundledAgdaPackageInfoCacheForDeprecatedVersions.packageInfo

/** A list of all deprecated Agda versions. */
export const agdaDeprecatedVersions = Object.keys(
  bundledAgdaPackageInfoCacheForDeprecatedVersions.packageInfo
) as AgdaVersion[]

/** A type guard for deprecated Agda versions. */
export function isDeprecatedAgdaVersion(
  version: string
): version is AgdaDeprecatedVersion {
  return (agdaDeprecatedVersions as string[]).includes(version)
}

// Agda Git References

/** The type of git references for the Agda repository. */
export type AgdaGitRef = 'HEAD'

/** A type guard for git references for the Agda repository. */
export function isAgdaGitRef(version: string): version is AgdaGitRef {
  return version === 'HEAD'
}

// Agda Version Specifications

/** The type of Agda version specifications, i.e., valid inputs to the action. */
export type AgdaVersionSpec = AgdaVersion | AgdaGitRef | 'latest' | 'nightly'

/** A type guard for Agda version specifications. */
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

// Agda Standard Library Versions

/** The type of agda-stdlib versions. */
export type AgdaStdlibVersion = keyof typeof bundledAgdaStdlibInfo

/** A list of all agda-stdlib versions. */
export const agdaStdlibVersions = Object.keys(
  bundledAgdaStdlibInfo
) as AgdaStdlibVersion[]

/** A type guard for agda-stdlib versions. */
export function isAgdaStdlibVersion(
  version: string
): version is AgdaStdlibVersion {
  return (agdaStdlibVersions as string[]).includes(version)
}

// Agda Standard Library Version Specifications

/** The type of agda-stdlib version specifications, i.e., valid inputs to the action. */
export type AgdaStdlibVersionSpec =
  | AgdaStdlibVersion
  | 'recommended'
  | 'latest'
  | 'experimental'
  | 'none'

/** A type guard for agda-stdlib version specifications. */
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

// Hackage Package Information

/** A cached copy of the package information for the Agda package on Hackage. */
export const agdaPackageInfoCache = hackage.mergePackageInfoCache(
  bundledAgdaPackageInfoCacheForDeprecatedVersions as hackage.PackageInfoCache,
  bundledAgdaPackageInfoCacheForNormalVersions as hackage.PackageInfoCache
)

// Distributions

/** The type of distributions types, e.g., zip archives, git repositories, etc. */
export type DistType = 'zip' | 'tgz' | 'txz' | 'git'

/** The type of distributions, i.e., the URL from which to download, with supplementary information. */
export type Dist =
  | string // <string> is shorthand for {url: <string>}
  | {
      url: string
      dir?: string
      sha256?: string
      tag?: string
      distType?: DistType
    }

// Agda Source Distributions

/**
 * The type of the Agda.yml file, which is bundled with setup-agda,
 * and contains all necessary information to build and install Agda.
 *
 * For each Agda version, it contains a series of binary distributions,
 * as well as the recommended configuration for building from source, and
 * the compatibility information for GHC and agda-stdlib.
 */
export type AgdaInfo = Record<
  AgdaVersion | 'nightly',
  {
    binary?: Partial<Record<Platform, Partial<Record<Arch, Dist[]>>>>
    configuration?: string | Record<Platform, string>
    compatibility?: {
      'agda-stdlib'?: string
      ghc?: string
    }
  }
>

/** The contents of Agda.yml. */
export const agdaInfo: AgdaInfo = bundledAgdaInfo

// Agda Standard Library Source Distributions

/**
 * The type of the agda-stdlib.json file, which is bundled with setup-agda,
 * and contains all necessary information to install agda-stdlib.
 *
 * For each agda-stdlib version it contains a source distributions.
 */
export type AgdaStdlibInfo = Partial<
  Record<AgdaStdlibVersion | 'experimental', {source: Dist}>
>

/** The contents of ./src/data/agda-stdlib.json. */
export const agdaStdlibInfo = bundledAgdaStdlibInfo as AgdaStdlibInfo

// Inputs for `haskell/actions/setup`

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
  | 'pre-build-hook'
  | 'configuration'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'agda-stdlib-default'
  | 'bdist-compress-exe'
  | 'bdist-license-report'
  | 'bdist-upload'
  | 'force-build'
  | 'force-no-build'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export interface BuildOptions extends SetupAgdaInputs {
  // Type refinements:
  'agda-version': AgdaVersion | 'HEAD' | 'nightly'
  'agda-stdlib-version': AgdaStdlibVersion | 'experimental' | 'none'
  configuration: string | 'none'
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
