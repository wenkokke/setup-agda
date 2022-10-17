import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import * as fs from 'node:fs'
import * as http from 'node:http'
import {homedir, EOL} from 'node:os'
import * as Mustache from 'mustache'
import * as path from 'node:path'
import * as process from 'node:process'
import * as semver from 'semver'
import distAgdaStdLibInfo from './package-info/Agda.stdlib.json'
import distPackageIndex from './package-info/index.json'
import distPackageInfoCache from './package-info/Agda.json'
import * as simver from './util/simver'
import ensureError from 'ensure-error'

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

export type AgdaVersion = keyof typeof distPackageInfoCache.packageInfo

export type SetupAgdaOption =
  | 'agda-version'
  | 'bdist-name'
  | 'ghc-version-range'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'bdist-compress-exe'
  | 'bdist-upload'
  | 'force-cluster-counting'
  | 'force-no-cluster-counting'
  | 'force-build'
  | 'force-no-build'
  | 'ghc-version-match-exact'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export type UPXVersion = '3.96'

export interface BuildOptions extends SetupAgdaInputs {
  'extra-include-dirs': string[]
  'extra-lib-dirs': string[]
  'ghc-supported-versions': string[]
  'icu-version'?: string
  'package-info-cache'?: PackageInfoCache
  'upx-version'?: string
}

// Should we ignore the GHC patch version?

export function shouldIgnoreGhcPatchVersion(options: BuildOptions): boolean {
  return !options['enable-stack'] && !options['ghc-version-match-exact']
}

// Should we setup ICU & pass --cluster-counting?

export function shouldEnableClusterCounting(options: BuildOptions): boolean {
  // TODO: does Agda before 2.5.3 depend on ICU by default,
  //       or does it not depend on ICU at all?
  return (
    !options['force-no-cluster-counting'] && supportsClusterCounting(options)
  )
}

export function shouldSetupIcu(options: BuildOptions): boolean {
  // TODO: does Agda before 2.5.3 depend on ICU by default,
  //       or does it not depend on ICU at all?
  return shouldEnableClusterCounting(options)
}

function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  // NOTE:
  //   Agda versions 2.5.3 - 2.6.2 depend on text-icu ^0.7, but versions
  //   0.7.0.0 - 0.7.1.0 do not compile with icu68+, which can be solved
  //   by passing '--constraint="text-icu >= 0.7.1.0"'
  return simver.gte(options['agda-version'], '2.5.3')
}

// Should we pass --optimise-heavily?

export function shouldEnableOptimiseHeavily(options: BuildOptions): boolean {
  // TODO: does Agda before 2.5.3 depend on ICU by default,
  //       or does it not depend on ICU at all?
  return supportsOptimiseHeavily(options)
}

function supportsOptimiseHeavily(options: BuildOptions): boolean {
  // NOTE:
  //   We only enable --optimise-heavily on versions which support it,
  //   i.e., versions after 2.6.2:
  //   https://github.com/agda/agda/blob/1175c41210716074340da4bd4caa09f4dfe2cc1d/doc/release-notes/2.6.2.md
  return simver.gte(options['agda-version'], '2.6.2')
}

// Should we build a with split sections?

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

// Should we run UPX?

export function shouldCompressExe(options: BuildOptions): boolean {
  // NOTE:
  //   Beware, on MacOS and Windows, resulting executables are unsigned,
  //   and therefore cause problems with security. There is a workaround
  //   for this on MacOS, implemented in 'setup-agda.repairPermissions'.
  return options['bdist-compress-exe'] && supportsUPX()
}

export function supportsUPX(): boolean {
  // UPX is broken on MacOS Big Sur, but the Homebrew version of UPX ships with
  // a patch that fixes this.
  return true
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

export const packageIndex = distPackageIndex as Partial<Record<string, string>>

export function findPkgUrl(pkg: string, version: string): string {
  const pkgKey = `${pkg}-${version}-${process.arch}-${process.platform}`
  const pkgUrl = packageIndex[pkgKey]
  if (pkgUrl === undefined) throw Error(`No package for ${pkgKey}`)
  else return pkgUrl
}

// Helpers for finding compatible standard library versions:

export const agdaStdlibInfo = distAgdaStdLibInfo as Record<
  AgdaVersion,
  string[]
>

export function stdlibVersionsFor(version: string): string[] {
  return agdaStdlibInfo?.[version as AgdaVersion] ?? []
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

// Helper to get the BuildOptions

export function getOptions(
  inputs?:
    | Partial<SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined),
  actionYml?: string
): BuildOptions {
  function getOption(k: SetupAgdaOption): string {
    const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    const inputValue = rawInputValue?.trim() ?? getDefault(k, actionYml) ?? ''
    core.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`)
    return inputValue
  }
  function getFlag(k: SetupAgdaFlag): boolean {
    const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    const inputValue = !(
      rawInputValue === false ||
      rawInputValue === null ||
      rawInputValue === undefined ||
      rawInputValue === '' ||
      rawInputValue === 'false'
    )
    core.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`)
    return inputValue
  }
  const options: BuildOptions = {
    // Specified in AgdaSetupInputs
    'agda-version': getOption('agda-version'),
    'bdist-compress-exe': getFlag('bdist-compress-exe'),
    'bdist-name': getOption('bdist-name'),
    'bdist-upload': getFlag('bdist-upload'),
    'force-build': getFlag('force-build'),
    'force-no-build': getFlag('force-no-build'),
    'force-cluster-counting': getFlag('force-cluster-counting'),
    'force-no-cluster-counting': getFlag('force-no-cluster-counting'),
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
    'extra-include-dirs': [],
    'extra-lib-dirs': [],
    'ghc-supported-versions': []
  }
  // Print options:
  core.info(
    [
      'Options:',
      ...Object.entries(options).map(entry => {
        const [key, value] = entry
        if (Array.isArray(value)) return `- ${key}: [${value.join(', ')}]`
        else return `- ${key}: ${value}`
      })
    ].join(EOL)
  )
  validateOptions(options)
  return options
}

let inputSpec:
  | Record<SetupAgdaOption, {default?: string | undefined}>
  | undefined = undefined

function getDefault(
  k: SetupAgdaOption,
  actionYml?: string
): string | undefined {
  if (inputSpec === undefined) {
    actionYml = actionYml ?? path.join(__dirname, '..', 'action.yml')
    inputSpec = (
      yaml.load(fs.readFileSync(actionYml, 'utf8')) as {
        inputs: Record<SetupAgdaOption, {default?: string}>
      }
    ).inputs
  }
  return inputSpec[k].default
}

function validateOptions(options: BuildOptions): void {
  if (options['agda-version'] === 'nightly')
    throw Error('Value "nightly" for input "agda-version" is unupported')
  if (options['ghc-version'] !== 'latest')
    throw Error('Input "ghc-version" is unsupported. Use "ghc-version-range"')
  if (!semver.validRange(options['ghc-version-range']))
    throw Error('Input "ghc-version-range" is not a valid version range')
  // If contradictory options are specified, throw an error:
  if (options['force-build'] && options['force-no-build'])
    throw Error('Build or not? What do you want from me? 🤷🏻‍♀️')
  if (options['force-cluster-counting'] && options['force-no-cluster-counting'])
    throw Error('Cluster counting or not? What do you want from me? 🤷🏻‍♀️')
  // If 'force-cluster-counting' is specified, and we cannot build with cluster
  // counting, throw an error:
  if (
    options['force-cluster-counting'] &&
    !shouldEnableClusterCounting(options)
  )
    throw Error(
      `Cannot build Agda ${options['agda-version']} with cluster counting`
    )
  try {
    // Join various parts of 'bdist-name', if it was defined over multiple lines.
    options['bdist-name'] = options['bdist-name'].split(/\s+/g).join('').trim()
    // Attempt to parse it, to ensure errors are raised early. Caches the result.
    Mustache.parse(options['bdist-name'])
  } catch (error) {
    throw Error(
      [
        `Could not parse bdist-name, '${options['bdist-name']}':`,
        ensureError(error).message
      ].join(EOL)
    )
  }
}

// Helper for comparing GHC versions respecting 'ghc-version-match-exact'

export function ghcVersionMatch(
  options: BuildOptions,
  v1: string,
  v2: string
): boolean {
  if (shouldIgnoreGhcPatchVersion(options)) {
    return simver.eq(simver.majorMinor(v1), simver.majorMinor(v2))
  } else {
    return simver.eq(v1, v2)
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
