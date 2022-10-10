import * as fs from 'fs'
import * as semver from 'semver'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as process from 'process'
import * as simver from './util/simver'
import * as http from 'http'
import {release} from 'os'

// Setup options for haskell/actions/setup:

export type SetupHaskellInputKey =
  | 'ghc-version'
  | 'cabal-version'
  | 'stack-version'
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'
  | 'disable-matcher'

export const setupHaskellInputKeys: SetupHaskellInputKey[] = [
  'ghc-version',
  'cabal-version',
  'stack-version',
  'enable-stack',
  'stack-no-global',
  'stack-setup-ghc',
  'disable-matcher'
]

export type SetupHaskellInputs = Partial<Record<SetupHaskellInputKey, string>>

// Setup options for this action:

export type SetupAgdaInputKey =
  | 'agda-version'
  | 'ghc-version-range'
  | 'upload-bdist'
  | 'upload-bdist-compress-bin'
  | 'upload-bdist-target-platform'
  | SetupHaskellInputKey

export const setupAgdaInputKeys: SetupAgdaInputKey[] = [
  'agda-version',
  'ghc-version-range',
  'upload-bdist',
  'upload-bdist-compress-bin',
  'upload-bdist-target-platform',
  ...setupHaskellInputKeys
] as SetupAgdaInputKey[]

export type SetupAgdaInputs = Readonly<Record<SetupAgdaInputKey, string>>

export type SetupAgdaInputDefaults = Partial<
  Record<SetupAgdaInputKey, {default?: string}>
>

function setupAgdaInputDefaults(): SetupAgdaInputs {
  return Object.fromEntries(
    Object.entries(
      (
        yaml.load(
          fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
        ) as {inputs: SetupAgdaInputDefaults}
      ).inputs
    ).map(entry => [entry[0], entry[1].default ?? ''])
  ) as SetupAgdaInputs
}

// Build options for this action:

export type ICUVersion = '67.1' | '71.1'

export type UPXVersion = '3.96'

export interface BuildOptions extends SetupAgdaInputs {
  readonly 'extra-lib-dirs': string[]
  readonly 'extra-include-dirs': string[]
  readonly 'icu-version'?: ICUVersion
  readonly 'upx-version'?: UPXVersion
  readonly 'package-info-cache'?: PackageInfoCache
}

export function fromSetupAgdaInputs(
  options?: Partial<SetupAgdaInputs>
): BuildOptions {
  // Set defaults:
  const buildOptions = {
    ...setupAgdaInputDefaults(),
    ...options,
    'extra-lib-dirs': [],
    'extra-include-dirs': []
  }
  // Unsupported: 'agda-version' set to 'nightly'
  if (buildOptions['agda-version'] === 'nightly') {
    throw Error('Value "nightly" for input "agda-version" is unupported')
  }
  // Unsupported: 'agda-version' set to anything but its default
  if (buildOptions['ghc-version'] !== 'latest') {
    throw Error('Input "ghc-version" is unsupported. Use "ghc-version-range"')
  }
  // Unsupported: 'upload-bdist-compress-bin' when UPX is not supported
  if (buildOptions['upload-bdist-compress-bin'] !== '' && !supportsUPX()) {
    throw Error(
      'Input "upload-bdist-compress-bin" is unsupported on MacOS <12 '
    )
  }
  // Check: 'ghc-version-range' must be a valid version range
  if (!semver.validRange(buildOptions['ghc-version-range'])) {
    throw Error('Input "ghc-version-range" is not a valid version range')
  }
  return buildOptions
}

function isSetupHaskellInputKey(key: string): key is SetupHaskellInputKey {
  return setupHaskellInputKeys.includes(key as SetupHaskellInputKey)
}

export function toSetupHaskellInputs(
  options: BuildOptions
): SetupHaskellInputs {
  return Object.fromEntries(
    Object.entries(options).filter(entry => isSetupHaskellInputKey(entry[0]))
  )
}

// Helper functions to check support of various build options

export function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   We only enable --cluster-counting on versions which support it,
  //   i.e., versions after 2.5.3:
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
  // UPX does not support MacOS 11 or below, which is Darwin 20 or below:
  return !(os === 'macos' && simver.lt(release(), '21'))
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
