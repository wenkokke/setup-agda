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
import assert from 'node:assert'

// Setup options for haskell/actions/setup:

export type SetupHaskellOption =
  | 'ghc-version'
  | 'cabal-version'
  | 'stack-version'

export type SetupHaskellFlag =
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'
  | 'disable-matcher'

export interface SetupHaskellInputs
  extends Record<SetupHaskellOption, string>,
    Record<SetupHaskellFlag, boolean> {}

// Setup options for this action:

export type SetupAgdaOption =
  | 'agda-version'
  | 'ghc-version-range'
  | 'bdist-name'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'disable-cluster-counting'
  | 'ghc-version-match-exact'
  | 'upload-bdist'
  | 'bdist-compress-bin'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export type UPXVersion = '3.96'

export interface BuildOptions extends Readonly<SetupAgdaInputs> {
  readonly 'compatible-ghc-versions': string[]
  readonly 'extra-lib-dirs': string[]
  readonly 'extra-include-dirs': string[]
  readonly 'icu-version'?: string
  readonly 'upx-version'?: UPXVersion
  readonly 'package-info-cache'?: PackageInfoCache
  readonly 'libs-to-bundle': string[]
}

// Helper functions to check support of various build options

export function addGhcVersionRestriction(options: BuildOptions): BuildOptions {
  // NOTE:
  //   Windows Server 2019 adds an extra restriction to the GHC
  //   version, the latest versions of GHC ship with their own,
  //   internal and incompatible copy of MSYS2:
  //   https://github.com/msys2/MINGW-packages/issues/10837#issue-1145843972
  if (isWindowsServerOlderThan2022()) {
    core.info('Add GHC version restriction "<9"')
    const ghcVersionRange = semver.validRange(
      `${options['ghc-version-range']} <9`
    )
    assert(
      ghcVersionRange !== null,
      `Invalid GHC version range "${options['ghc-version-range']} <9.2"`
    )
    return {...options, 'ghc-version-range': ghcVersionRange}
  } else {
    return options
  }
}

export function enableClusterCounting(options: BuildOptions): boolean {
  return (
    !options['disable-cluster-counting'] &&
    supportsClusterCounting(options) &&
    !isWindowsServerOlderThan2022()
  )
}

export function isWindowsServerOlderThan2022(): boolean {
  return os === 'windows' && simver.lte(release(), '10.0.17763')
}

export function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  //   const agdaOK = simver.gte(options['agda-version'], '2.5.3')
  const flagSupported = simver.gte(options['agda-version'], '2.5.3')
  // NOTE:
  //   We only enable --cluster-counting on versions after 2.6.2,
  //   since Agda version 2.5.3 - 2.6.2 depend on text-icu ^0.7, but
  //   text-icu versions <0.7.1.0 fail to compile with icu68+, and we
  //   do not currently support building with outdated versions of ICU:
  const icuVersionOK = simver.gte(options['agda-version'], '2.6.2')
  // NOTE:
  //   We only enable --cluster-counting on recent versions of Windows:
  // const osOK = os === 'linux' || os === 'macos' || osVersion === 'windows-2022'
  return flagSupported && icuVersionOK // && osOK
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
  readonly packageInfo: PackageInfo
  readonly lastModified: string
}

export interface PackageInfoOptions {
  readonly fetchPackageInfo?: boolean
  readonly packageInfoCache?: PackageInfoCache
  readonly packageInfoHeaders?: http.OutgoingHttpHeaders
  readonly returnCacheOnError?: boolean
}

export interface PackageSourceOptions extends PackageInfoOptions {
  readonly packageVersion?: 'latest' | string
  readonly archivePath?: string
  readonly downloadAuth?: string
  readonly downloadHeaders?: http.OutgoingHttpHeaders
  readonly extractToPath?: string
  readonly tarFlags?: string[]
  readonly validateVersion?: boolean
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
  let options: BuildOptions = {
    'agda-version': getOption('agda-version'),
    'ghc-version-range': getOption('ghc-version-range'),
    'compatible-ghc-versions': [],
    'ghc-version': getOption('ghc-version'),
    'cabal-version': getOption('cabal-version'),
    'stack-version': getOption('stack-version'),
    'disable-cluster-counting': getFlag('disable-cluster-counting'),
    'ghc-version-match-exact': getFlag('ghc-version-match-exact'),
    'upload-bdist': getFlag('upload-bdist'),
    'bdist-name': getOption('bdist-name'),
    'bdist-compress-bin': getFlag('bdist-compress-bin'),
    'enable-stack': getFlag('enable-stack'),
    'stack-no-global': getFlag('stack-no-global'),
    'stack-setup-ghc': getFlag('stack-setup-ghc'),
    'disable-matcher': getFlag('disable-matcher'),
    'extra-lib-dirs': [],
    'extra-include-dirs': [],
    'libs-to-bundle': []
  }

  // Validate build options:
  if (options['agda-version'] === 'nightly')
    throw Error('Value "nightly" for input "agda-version" is unupported')
  if (options['ghc-version'] !== 'latest')
    throw Error('Input "ghc-version" is unsupported. Use "ghc-version-range"')
  if (options['bdist-compress-bin'] && !supportsUPX())
    throw Error('Input "bdist-compress-bin" is unsupported on MacOS <12')
  if (!semver.validRange(options['ghc-version-range']))
    throw Error('Input "ghc-version-range" is not a valid version range')

  // Refine build options:
  options = addGhcVersionRestriction(options)
  return options
}

export function pickSetupHaskellInputs(
  options: BuildOptions
): SetupHaskellInputs {
  return pick(options, [
    'ghc-version',
    'cabal-version',
    'stack-version',
    'enable-stack',
    'stack-no-global',
    'stack-setup-ghc',
    'disable-matcher'
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
