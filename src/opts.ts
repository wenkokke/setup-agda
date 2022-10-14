import * as core from '@actions/core'
import * as fs from 'node:fs'
import * as semver from 'semver'
import * as yaml from 'js-yaml'
import * as path from 'node:path'
import * as process from 'node:process'
import * as simver from './util/simver'
import * as http from 'node:http'
import pick from 'object.pick'
import {homedir, release} from 'node:os'
import distPackageInfoCache from './package-info/Agda.json'
import distBdistIndex from './package-info/Agda.bdist.json'

// Setup options for haskell/actions/setup:

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

// Setup options for this action:

export type SetupAgdaOption =
  | 'agda-version'
  | 'bdist-name'
  | 'ghc-version-range'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'bdist-compress-exe'
  | 'bdist-upload'
  | 'disable-cluster-counting'
  | 'force-build'
  | 'ghc-version-match-exact'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export type UPXVersion = '3.96'

export interface BuildOptions extends SetupAgdaInputs {
  'compatible-ghc-versions': string[]
  'extra-lib-dirs': string[]
  'extra-include-dirs': string[]
  'icu-version'?: string
  'libs-to-bundle': string[]
  'package-info-cache'?: PackageInfoCache
  'upx-version'?: string
}

// Helper functions to check support of various build options

export function enableClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   We only enable --cluster-counting on versions after 2.6.2,
  //   since Agda version 2.5.3 - 2.6.2 depend on text-icu ^0.7, but
  //   text-icu versions <0.7.1.0 fail to compile with icu68+, and we
  //   do not currently support building with outdated versions of ICU:
  return (
    !options['disable-cluster-counting'] &&
    supportsClusterCounting(options) &&
    simver.gte(options['agda-version'], '2.6.2')
  )
}

export function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  return simver.gte(options['agda-version'], '2.5.3')
}

export function supportsOptimiseHeavily(options: BuildOptions): boolean {
  // NOTE:
  //   We only enable --optimise-heavily on versions which support it,
  //   i.e., versions after 2.6.2:
  //   https://github.com/agda/agda/blob/1175c41210716074340da4bd4caa09f4dfe2cc1d/doc/release-notes/2.6.2.md
  return simver.gte(options['agda-version'], '2.6.2')
}

export function supportsExecutableStatic(options: BuildOptions): boolean {
  // NOTE:
  //  We only set --enable-executable-static on Linux, because the deploy workflow does it.
  //  https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-executable-static
  const osOK = false // os === 'linux' // Unsupported on Ubuntu 20.04
  // NOTE:
  //  We only set --enable-executable-static if Ghc >=8.4, when the flag was added:
  //  https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-static
  const ghcVersionOK = simver.gte(options['ghc-version'], '8.4')
  return osOK && ghcVersionOK
}

export function supportsSplitSections(options: BuildOptions): boolean {
  // NOTE:
  //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
  //   https://github.com/agda/agda/issues/5940
  const osOK = os === 'linux' || os === 'windows'
  // NOTE:
  //   We only set --split-sections if Ghc >=8.0 and Cabal >=2.2, when the flag was added:
  //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
  const ghcVersionOK = simver.gte(options['ghc-version'], '8.0')
  const cabalVersionOK = simver.gte(options['cabal-version'], '2.2')
  return osOK && ghcVersionOK && cabalVersionOK
}

export function supportsUPX(): boolean {
  // UPX does not support MacOS 11 Big Sur or earlier:
  return os !== 'macos' || simver.lt(release(), '21')
}

// Package info for Hackage:

export type PackageStatus = 'normal' | 'deprecated'

export type PackageInfo = Record<string, PackageStatus | undefined>

export interface PackageInfoCache {
  packageInfo: PackageInfo
  lastModified: string
}

export interface PackageInfoOptions {
  fetchPackageInfo?: boolean
  packageInfoCache?: PackageInfoCache
  packageInfoHeaders?: http.OutgoingHttpHeaders
  returnCacheOnError?: boolean
}

export interface PackageSourceOptions extends PackageInfoOptions {
  packageVersion?: 'latest' | string
  archivePath?: string
  downloadAuth?: string
  downloadHeaders?: http.OutgoingHttpHeaders
  extractToPath?: string
  tarFlags?: string[]
  validateVersion?: boolean
}

export const packageInfoCache = distPackageInfoCache as PackageInfoCache

// Helpers for finding binary distributions:

export const bdistIndex = distBdistIndex as Partial<Record<string, string>>

// Helpers for matching the OS:

export type OS = 'linux' | 'macos' | 'windows'

export const os: OS = (() => {
  switch (process.platform) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'macos'
    case 'win32':
      return 'windows'
    default:
      throw Error(`Unsupported platform ${process.platform}`)
  }
})()

// Helper to get the BuildOptions

export function getOptions(
  inputs?:
    | Partial<SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined)
): BuildOptions {
  // Get build options or their defaults
  const inputSpec = (
    yaml.load(
      fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
    ) as {inputs: Record<SetupAgdaOption, {default?: string}>}
  ).inputs
  const getOption = (k: SetupAgdaOption): string => {
    const maybeInput = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    return maybeInput ?? inputSpec[k]?.default ?? ''
  }
  const getFlag = (k: SetupAgdaFlag): boolean => {
    const maybeInput = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    return ![false, '', 'false', undefined].includes(maybeInput)
  }
  const options: BuildOptions = {
    // Specified in AgdaSetupInputs
    'agda-version': getOption('agda-version'),
    'bdist-compress-exe': getFlag('bdist-compress-exe'),
    'bdist-name': getOption('bdist-name'),
    'bdist-upload': getFlag('bdist-upload'),
    'disable-cluster-counting': getFlag('disable-cluster-counting'),
    'force-build': getFlag('force-build'),
    'ghc-version-match-exact': getFlag('ghc-version-match-exact'),
    'ghc-version-range': getOption('ghc-version-range'),

    // Specified in HaskellSetupInputs
    'cabal-version': getOption('cabal-version'),
    'disable-matcher': getFlag('disable-matcher'),
    'enable-stack': getFlag('enable-stack'),
    'ghc-version': getOption('ghc-version'),
    'stack-no-global': getFlag('stack-no-global'),
    'stack-setup-ghc': getFlag('stack-setup-ghc'),
    'stack-version': getOption('stack-version'),

    // Specified in BuildOptions
    'compatible-ghc-versions': [],
    'extra-lib-dirs': [],
    'extra-include-dirs': [],
    'libs-to-bundle': []
  }

  // Validate build options:
  if (options['agda-version'] === 'nightly')
    throw Error('Value "nightly" for input "agda-version" is unupported')
  if (options['ghc-version'] !== 'latest')
    throw Error('Input "ghc-version" is unsupported. Use "ghc-version-range"')
  if (options['bdist-compress-exe'] && !supportsUPX())
    throw Error('Input "bdist-compress-exe" is unsupported on MacOS <12')
  if (!semver.validRange(options['ghc-version-range']))
    throw Error('Input "ghc-version-range" is not a valid version range')

  return options
}

export function pickSetupHaskellInputs(
  options: BuildOptions
): SetupHaskellInputs {
  return pick(options, [
    'cabal-version',
    'disable-matcher',
    'enable-stack',
    'ghc-version',
    'stack-no-global',
    'stack-setup-ghc',
    'stack-version'
  ])
}

// Helper for comparing GHC versions respecting 'ghc-version-match-exact'

export function ghcVersionMatch(
  options: BuildOptions,
  v1: string,
  v2: string
): boolean {
  if (options['ghc-version-match-exact']) {
    return v1 === v2
  } else {
    const sv1 = semver.parse(v1)
    if (sv1 === null) {
      core.warning(`Could not parse GHC version ${v1}`)
      return false
    }
    const sv2 = semver.parse(v2)
    if (sv2 === null) {
      core.warning(`Could not parse GHC version ${v2}`)
      return false
    }
    return sv1.major === sv2.major && sv1.minor === sv2.minor
  }
}

// Helpers for getting the system directories

export function agdaDir(): string {
  switch (os) {
    case 'linux':
    case 'macos':
      return path.join(homedir(), '.agda')
    case 'windows':
      return path.join(homedir(), 'AppData', 'Roaming', 'agda')
  }
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}
