import assert from 'node:assert'
import os from 'node:os'
import nunjucks from 'nunjucks'
import pick from 'object.pick'
import semver from 'semver'
import bundledSetupAgdaPackage from '../data/setup-agda/package.json'
import bundledSetupAgdaAction from '../data/setup-agda/action.json'
import bundledAgdaStdlibVersions from '../data/agda-stdlib.versions.json'
import bundledAgdaComponents from '../data/Agda.components.json'
import bundledAgdaVersions from '../data/Agda.versions.json'
import bundledSetupHaskellAction from '../data/setup-haskell/action.json'
import bundledHaskellVersions from '../data/setup-haskell/versions.json'
import ghc from '../util/deps/ghc.js'
import ensureError from 'ensure-error'
import { splitLines } from '../util/lines.js'
import * as simver from '../util/simver.js'
import { Arch, platform, Platform } from './platform.js'

// Program Information

export const version = bundledSetupAgdaPackage.version

// Agda Components

/** The type of Agda components. */
export type AgdaComponent = keyof typeof bundledAgdaComponents

/** A dictionary mapping each Agda component to its corresponding executable name. */
export const agdaComponents: Record<
  AgdaComponent,
  Record<'exe', string>
> = bundledAgdaComponents

// On Windows: add .exe extension
if (platform === 'windows') {
  for (const component of Object.keys(agdaComponents)) {
    agdaComponents[component as AgdaComponent].exe += '.exe'
  }
}

// Agda Normal Versions

/** The type of Agda versions. */
export type AgdaVersion = keyof typeof bundledAgdaVersions

/** A list of all Agda versions. */
export const agdaVersions = Object.keys(bundledAgdaVersions) as AgdaVersion[]

/** A type guard for Agda versions. */
export function isAgdaVersion(version: string): version is AgdaVersion {
  return (agdaVersions as string[]).includes(version)
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

// Agda Version Resolution

/** Resolve an Agda version specification to an Agda version. */
function resolveAgdaVersion(
  versionSpec: AgdaVersionSpec
): AgdaVersion | 'HEAD' | 'nightly' {
  if (versionSpec === 'latest') {
    const latest = simver.max(agdaVersions)
    assert(
      latest !== null,
      [
        'Could not resolve latest Agda version',
        `from list of known versions ${agdaVersions.join(', ')}`
      ].join(' ')
    )
    assert(
      isAgdaVersion(latest),
      [
        `Resolved latest Agda version to version '${latest}'`,
        `not in list of known versions ${agdaVersions.join(', ')}`
      ].join(' ')
    )
    return latest
  } else {
    return versionSpec
  }
}

// Agda Standard Library Versions

/** The type of agda-stdlib versions. */
export type AgdaStdlibVersion = keyof typeof bundledAgdaStdlibVersions

/** A list of all agda-stdlib versions. */
export const agdaStdlibVersions = Object.keys(
  bundledAgdaStdlibVersions
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

// Agda Standard Library Version Resolution

/** Resolve an agda-stdlib version specification to an agda-stdlib version. */
function resolveAgdaStdlibVersion(
  agdaVersion: AgdaVersion | 'HEAD' | 'nightly',
  agdaStdlibVersionSpec: AgdaStdlibVersionSpec
): AgdaStdlibVersion | 'experimental' | 'none' {
  if (agdaStdlibVersionSpec === 'none') {
    return agdaStdlibVersionSpec
  } else if (agdaStdlibVersionSpec === 'latest') {
    const latest = simver.max(agdaStdlibVersions)
    assert(
      latest !== null,
      [
        `Could not resolve latest agda-stdlib version`,
        `from list of known versions [${agdaStdlibVersions.join(', ')}]`
      ].join(' ')
    )
    assert(
      isAgdaStdlibVersion(latest),
      [
        `Resolved latest agda-stdlib version to version '${latest}'`,
        `not in list of known versions [${agdaStdlibVersions.join(', ')}]`
      ].join(' ')
    )
    logger.info(`Resolved latest Agda version to ${latest}`)
    return latest
  } else if (agdaStdlibVersionSpec === 'recommended') {
    if (agdaVersion === 'HEAD' || agdaVersion === 'nightly') {
      return 'experimental'
    } else {
      const agdaStdlibVersionRange =
        agdaInfo[agdaVersion].compatibility?.['agda-stdlib']
      if (agdaStdlibVersionRange === undefined)
        throw Error(
          `No known compatible agda-stdlib versions for ${agdaVersion}; check Agda.yml?`
        )
      const recommended = simver.maxSatisfying(
        agdaStdlibVersions,
        agdaStdlibVersionRange
      )
      assert(
        recommended !== null,
        [
          `Could not resolve recommended agda-stdlib version`,
          `from compatible versions ${agdaStdlibVersionRange}`
        ].join(' ')
      )
      assert(
        isAgdaStdlibVersion(recommended),
        [
          `Resolved recommended agda-stdlib version to version '${recommended}'`,
          `not in list of compatible versions ${agdaStdlibVersionRange}`
        ].join(' ')
      )
      return recommended
    }
  } else {
    return agdaStdlibVersionSpec
  }
}

// GHC Version Resolution

/** Resolve the GHC version. Should be done lazily by the build command. */
async function resolveGhcVersion(
  agdaVersion: AgdaVersion | 'HEAD',
  ghcVersionSpec: string
): Promise<string> {
  if (ghcVersionSpec === 'recommended') {
    // Determine the GHC version range
    const ghcVersionRange =
      agdaVersion === 'HEAD' ? '*' : agdaInfo[agdaVersion].compatibility?.ghc
    if (ghcVersionRange === undefined)
      throw Error(`No known compatible GHC versions for Agda ${agdaVersion}`)
    // Check if the current version of GHC is compatible
    const currentGhcVersion = await ghc.maybeGetVersion()
    if (
      currentGhcVersion !== null &&
      semver.satisfies(currentGhcVersion, ghcVersionRange)
    )
      return currentGhcVersion
    // Find the latest satisfying GHC version supported by setup-haskell:
    const ghcVersion = semver.maxSatisfying(
      bundledHaskellVersions.ghc,
      ghcVersionRange
    )
    if (ghcVersion === null)
      throw Error(`Cannot find GHC version satisfying '${ghcVersionRange}'`)
    return ghcVersion
  } else if (ghcVersionSpec === 'latest') {
    const ghcVersion = semver.maxSatisfying(bundledHaskellVersions.ghc, '*')
    assert(ghcVersion !== null)
    return ghcVersion
  } else {
    return ghcVersionSpec
  }
}

// Agda Build Configuration Resolution

function resolveConfigureOptions(
  agdaVersion: AgdaVersion | 'HEAD' | 'nightly',
  configureOptions: string
): string {
  switch (agdaVersion) {
    case 'HEAD':
      return ''
    case 'nightly':
      return ''
    default: {
      const clean = (str: string): string =>
        splitLines(str)
          .map((ln) => ln.trim())
          .join(' ')
      switch (configureOptions) {
        case 'none':
          return ''
        case 'recommended': {
          const { configuration } = agdaInfo[agdaVersion]
          if (configuration === undefined) return ''
          else if (typeof configuration === 'string')
            return clean(configuration)
          else return clean(configuration[platform])
        }
        default:
          return clean(configureOptions)
      }
    }
  }
}

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
export const agdaInfo: AgdaInfo = bundledAgdaVersions

// Agda Standard Library Source Distributions

/**
 * The type of the agda-stdlib.json file, which is bundled with setup-agda,
 * and contains all necessary information to install agda-stdlib.
 *
 * For each agda-stdlib version it contains a source distributions.
 */
export type AgdaStdlibInfo = Partial<
  Record<AgdaStdlibVersion | 'experimental', { source: Dist }>
>

/** The contents of ./src/data/agda-stdlib.json. */
export const agdaStdlibInfo = bundledAgdaStdlibVersions as AgdaStdlibInfo

// Generic Action Inputs

/** The raw type of inputs for a GitHub Action. All properties have type string. */
type ActionInputStringsFor<ActionYmlInputs> = {
  [Property in keyof ActionYmlInputs]: string
}

/** The type of inputs for a GitHub Action. Flags have type boolean. */
type ActionInputsFor<ActionYmlInputs> = {
  [Property in keyof ActionYmlInputs]: ActionYmlInputs[Property] extends {
    default: string
  }
    ? string
    : boolean
}

export function getInputs<ActionYmlInputs>(
  actionYmlInputs: Partial<Record<string, unknown>>,
  getInput:
    | Partial<Record<string, string>>
    | ((key: string) => string | undefined)
): ActionInputsFor<ActionYmlInputs> {
  const getValue =
    typeof getInput === 'function' ? getInput : (key: string) => getInput[key]
  const getFlag = (key: string): boolean =>
    ![undefined, null, false, 'false', ''].includes(getValue(key))
  const result: Partial<Record<string, string | boolean>> = {}
  for (const [key, spec] of Object.entries<unknown>(actionYmlInputs)) {
    const defaultValue = (spec as { default?: string }).default
    result[key] =
      defaultValue === undefined ? getFlag(key) : getValue(key) ?? defaultValue
  }
  return result as ActionInputsFor<ActionYmlInputs>
}

// Inputs for setup-agda

/** The action inputs taken from `./action.yml`. */
export const actionYml = bundledSetupAgdaAction

/** The type of `./action.yml`. */
type SetupAgdaActionYmlInputs = typeof actionYml.inputs

/** The raw type of inputs for the GitHub Action. All properties have type string. */
export type ActionInputStrings = ActionInputStringsFor<SetupAgdaActionYmlInputs>

// Action Options

/** The type of options for the GitHub Action. */
export interface ActionOptions
  extends ActionInputsFor<SetupAgdaActionYmlInputs> {
  'agda-version': AgdaVersion | 'nightly' | 'HEAD'
  'agda-stdlib-version': AgdaStdlibVersion | 'experimental' | 'none'
}

export function getOptions(
  getInput:
    | Partial<Record<string, string>>
    | ((key: string) => string | undefined)
): ActionOptions {
  const inputs = getInputs<SetupAgdaActionYmlInputs>(
    bundledSetupAgdaAction.inputs,
    getInput
  )

  // Resolve the Agda version specification:
  const agdaVersionSpec = inputs['agda-version']
  if (!isAgdaVersionSpec(agdaVersionSpec))
    throw Error(`Unknown Agda version '${agdaVersionSpec}'`)
  const agdaVersion = resolveAgdaVersion(agdaVersionSpec)

  // Resolve the agda-stdlib version specification:
  const agdaStdlibVersionSpec = inputs['agda-stdlib-version']
  if (!isAgdaStdlibVersionSpec(agdaStdlibVersionSpec))
    throw Error(`Unknown Agda version '${agdaVersionSpec}'`)
  const agdaStdlibVersion = resolveAgdaStdlibVersion(
    agdaVersion,
    agdaStdlibVersionSpec
  )

  // Return the inputs with the resolved versions:
  return {
    ...inputs,
    'agda-version': agdaVersion,
    'agda-stdlib-version': agdaStdlibVersion
  }
}

// Build Command Options

/** The type of keys for options for the bundle command. */
export type BundleOptionKey =
  | 'bundle'
  | 'bundle-name'
  | 'bundle-compress'
  | 'bundle-license-report'

/** The type of options for the bundle command. */
export interface BundleOptions extends Pick<ActionOptions, BundleOptionKey> {
  upx?: string
  'bundle-name-template': nunjucks.Template
}

/** Pick the BundleOptions from a larger object and validate them. */
function pickBundleOptions<
  Options extends Pick<ActionOptions, BundleOptionKey>
>(options: Options): BundleOptions {
  // Validate the bundle name:
  const bundleName = options['bundle-name'].split(/\s+/g).join('').trim()
  try {
    const env = nunjucks.configure({
      autoescape: false,
      throwOnUndefined: true
    })
    const tpl = new nunjucks.Template(bundleName, env, undefined, true)

    // Return the validated BundleOptions:
    return {
      ...pick(options, ['bundle', 'bundle-compress', 'bundle-license-report']),
      'bundle-name': bundleName,
      'bundle-name-template': tpl
    }
  } catch (error) {
    throw Error(
      [
        `Could not parse bundle name '${bundleName}':`,
        ensureError(error).message
      ].join(os.EOL)
    )
  }
}

/** The type of keys for options for the build command. */
export type BuildOptionKey =
  | 'agda-version'
  | 'configure-options'
  | SetupHaskellOptionKey

/** The type of options for the build command. */
export interface BuildOptions extends Pick<ActionOptions, BuildOptionKey> {
  'agda-version': AgdaVersion | 'HEAD'
  'bundle-options'?: BundleOptions
  'cabal-plan'?: string
  'working-directory'?: string
  dest?: string
  verbosity?: Verbosity
}

/** Pick the BuildOptions from a larger object and validate them. */
export async function pickBuildOptions<
  Options extends Pick<ActionOptions, BuildOptionKey | BundleOptionKey>
>(options: Options): Promise<BuildOptions> {
  // Validate the Agda version:
  const agdaVersion = options['agda-version']
  if (agdaVersion === 'nightly')
    throw Error(`Cannot build Agda version 'nightly'; did you mean 'HEAD'?`)

  const setupHaskellOptions = pickSetupHaskellOptions(options)

  // Resolve the GHC version specification:
  const ghcVersionSpec = setupHaskellOptions['ghc-version']
  const ghcVersion = await resolveGhcVersion(agdaVersion, ghcVersionSpec)

  // Resolve the Agda configuration options:
  const configureOptions = resolveConfigureOptions(
    agdaVersion,
    options['configure-options']
  )

  // Check for incompatible options:
  if (setupHaskellOptions['stack-no-global'])
    throw Error('Value `true` for input `stack-no-global` is unsupported.')

  // Resolve bundle options:
  const bundleOptions = options['bundle']
    ? pickBundleOptions(options)
    : undefined

  // Return the validated BuildOptions:
  return {
    ...setupHaskellOptions,
    'agda-version': agdaVersion,
    'configure-options': configureOptions,
    'ghc-version': ghcVersion,
    'bundle-options': bundleOptions
  }
}

// Install Command Options

/** The type of keys for options for the install command. */
export type InstallOptionKey = 'agda-version'

/** The type of options for the install command. */
export interface InstallOptions extends Pick<ActionOptions, InstallOptionKey> {
  'agda-version': AgdaVersion | 'nightly'
  dest?: string
}

/** Pick the InstallOptions from a larger object and validate them. */
export function pickInstallOptions<
  Options extends Pick<ActionOptions, InstallOptionKey>
>(options: Options): InstallOptions {
  // Validate the Agda version:
  const agdaVersion = options['agda-version']
  if (agdaVersion === 'HEAD')
    throw Error(`Cannot build Agda version 'HEAD'; did you mean 'nightly'?`)

  // Return the validated InstallOptions:
  return { 'agda-version': agdaVersion }
}

// Install Command Options

/** The type of keys for options for the set command. */
export type SetOptionKey = 'agda-version'

/** The type of options for the set command. */
export interface SetOptions extends Pick<ActionOptions, SetOptionKey> {
  'agda-version': AgdaVersion
  dest?: string
}

/** Pick the SetOptions from a larger object and validate them. */
export function pickSetOptions<
  Options extends Pick<ActionOptions, SetOptionKey>
>(options: Options): SetOptions {
  // Validate the Agda version:
  const agdaVersion = options['agda-version']
  if (agdaVersion === 'HEAD')
    throw Error(`Cannot set Agda version 'HEAD'; not yet implemented.`)
  if (agdaVersion === 'nightly')
    throw Error(`Cannot set Agda version 'nightly'; not yet implemented.`)

  // Return the validated SetOptions:
  return { 'agda-version': agdaVersion }
}

// Setup Haskell Action Inputs

/** The type of `./vendor/haskell/actions/setup/action.yml`. */
type SetupHaskellActionYmlInputs = typeof bundledSetupHaskellAction.inputs

/** The type of properties of inputs for the `haskell/actions/setup` GitHub Action. */
type SetupHaskellOptionKey = keyof SetupHaskellActionYmlInputs

/** The raw type of inputs for the `haskell/actions/setup` GitHub Action. All properties have type string. */
export type SetupHaskellActionInputs =
  ActionInputStringsFor<SetupHaskellActionYmlInputs>

/** The type of inputs for the `haskell/actions/setup` GitHub Action. */
export type SetupHaskellActionOptions =
  ActionInputsFor<SetupHaskellActionYmlInputs>

export function pickSetupHaskellOptions<
  Options extends Pick<ActionOptions, SetupHaskellOptionKey>
>(options: Options): SetupHaskellActionOptions {
  const setupHaskellOptionKeys = Object.keys(
    bundledSetupHaskellAction.inputs
  ) as SetupHaskellOptionKey[]
  return pick(options, setupHaskellOptionKeys)
}
