import * as fs from 'fs'
import * as semver from 'semver'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as process from 'process'
import * as simver from './util/simver'
import * as http from 'http'
import pick from 'object.pick'
import {release} from 'os'

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
  | 'upload-bdist'
  | 'bdist-compress-bin'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export type UPXVersion = '3.96'

export interface BuildOptions extends Readonly<SetupAgdaInputs> {
  readonly 'extra-lib-dirs': string[]
  readonly 'extra-include-dirs': string[]
  readonly 'icu-version'?: string
  readonly 'upx-version'?: UPXVersion
  readonly 'package-info-cache'?: PackageInfoCache
  readonly 'libs-to-bundle': string[]
}

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
  const options = {
    'agda-version': getOption('agda-version'),
    'ghc-version-range': getOption('ghc-version-range'),
    'ghc-version': getOption('ghc-version'),
    'cabal-version': getOption('cabal-version'),
    'stack-version': getOption('stack-version'),
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
  // Validate build options
  if (options['agda-version'] === 'nightly')
    throw Error('Value "nightly" for input "agda-version" is unupported')
  if (options['ghc-version'] !== 'latest')
    throw Error('Input "ghc-version" is unsupported. Use "ghc-version-range"')
  if (options['bdist-compress-bin'] && !supportsUPX())
    throw Error('Input "bdist-compress-bin" is unsupported on MacOS <12')
  if (!semver.validRange(options['ghc-version-range']))
    throw Error('Input "ghc-version-range" is not a valid version range')
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

// Helper functions to check support of various build options

export function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  //   const agdaOK = simver.gte(options['agda-version'], '2.5.3')
  // NOTE:
  //   But we only enable --cluster-counting on versions after 2.6.2,
  //   since Agda version 2.5.3 - 2.6.2 depend on text-icu ^0.7, but
  //   text-icu versions <0.7.1.0 fail to compile with icu68+
  const agdaOK = simver.gte(options['agda-version'], '2.6.2')
  // NOTE:
  //   We also don't support cluster counting on Windows Server 2019
  //   and earlier, as the latest versions of GHC and Cabal are
  //   incompatible with its MSYS2 version:
  //   https://github.com/msys2/MINGW-packages/issues/10837#issue-1145843972
  const osOK = os !== 'windows' || simver.gt(release(), '10.0.17763')
  return agdaOK && osOK
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
