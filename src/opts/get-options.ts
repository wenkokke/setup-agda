import * as core from '@actions/core'
import * as yaml from 'js-yaml'
import Mustache from 'mustache'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as semver from 'semver'
import ensureError from '../util/ensure-error'
import * as plat from './platform'
import resolveAgdaStdlibVersion from './resolve-agda-stdlib-version'
import resolveAgdaVersion from './resolve-agda-version'
import * as opts from './types'

export default function getOptions(
  inputs?:
    | Partial<opts.SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined),
  actionYml?: string
): opts.BuildOptions {
  function getOption(k: opts.SetupAgdaOption): string {
    const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    const inputValue = rawInputValue?.trim() ?? getDefault(k, actionYml) ?? ''
    core.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`)
    return inputValue
  }
  function getFlag(k: opts.SetupAgdaFlag): boolean {
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
  function getFlagPair(
    flagOn: opts.SetupAgdaFlag,
    flagOff: opts.SetupAgdaFlag
  ): [boolean, boolean] {
    const [on, off] = [getFlag(flagOn), getFlag(flagOff)]
    if (on && off) throw Error(`Flags ${flagOn} and ${flagOff} conflict.`)
    return [on, off]
  }

  // Resolve Agda version:
  const agdaVersionSpec = getOption('agda-version')
  if (!opts.isAgdaVersionSpec(agdaVersionSpec))
    if (opts.isDeprecatedAgdaVersion(agdaVersionSpec))
      throw Error(`Agda version ${agdaVersionSpec} is deprecated`)
    else throw Error(`Could not parse Agda version ${agdaVersionSpec}`)
  const agdaVersion: opts.AgdaVersion | 'HEAD' | 'nightly' =
    resolveAgdaVersion(agdaVersionSpec)

  // Resolve agda-stdlib version:
  const agdaStdlibVersionSpec = getOption('agda-stdlib-version')
  if (!opts.isAgdaStdlibVersionSpec(agdaStdlibVersionSpec))
    throw Error(
      `Unsupported value for input 'agda-stdlib-version': '${agdaStdlibVersionSpec}'`
    )
  const agdaStdlibVersion: opts.AgdaStdlibVersion | 'experimental' | 'none' =
    resolveAgdaStdlibVersion(agdaVersion, agdaStdlibVersionSpec)

  // Validate ghc-version-range:
  const ghcVersionRange = getOption('ghc-version-range')
  if (!semver.validRange(ghcVersionRange))
    throw Error('Input "ghc-version-range" is not a valid version range')

  // Check for contradictory options:
  const [forceBuild, forceNoBuild] = getFlagPair(
    'force-build',
    'force-no-build'
  )
  const [forceClusterCounting, forceNoClusterCounting] = getFlagPair(
    'force-cluster-counting',
    'force-no-cluster-counting'
  )
  const [forceOptimiseHeavily, forceNoOptimiseHeavily] = getFlagPair(
    'force-optimise-heavily',
    'force-no-optimise-heavily'
  )

  // Parse the bdist name:
  const bdistName = parseBdistName(getOption('bdist-name'))
  const bdistRetentionDays = getOption('bdist-retention-days')
  const bdistRetentionDaysInt = parseInt(bdistRetentionDays)
  if (!(0 <= bdistRetentionDaysInt && bdistRetentionDaysInt <= 90))
    throw Error(
      [
        `Input "bdist-rentention-days" must be a number between 0 and 90.`,
        `Found "${bdistRetentionDays}".`
      ].join(' ')
    )

  // Parse agda-libraries and agda-defaults:
  const agdaLibraries = getOption('agda-libraries')
  const agdaLibraryList: opts.DistIndexEntry[] = []
  for (const agdaLibrary of agdaLibraries.split(/\r?\n/g)) {
    if (agdaLibrary.match(/^\s*$/)) continue
    const [agdaLibraryUrl, agdaLibraryTag] = agdaLibrary.trim().split('#', 2)
    agdaLibraryList.push({
      url: agdaLibraryUrl,
      tag: agdaLibraryTag,
      distType: 'git'
    })
  }
  const agdaDefaults = getOption('agda-defaults')
  const agdaDefaultList: opts.DistIndexEntry[] = []
  for (const agdaDefault of agdaDefaults.split(/\r?\n/g)) {
    if (agdaDefault.match(/^\s*$/)) continue
    agdaDefaultList.push(agdaDefault.trim())
  }

  // Create build options:
  const options: opts.BuildOptions = {
    // Specified in Agdaopts.SetupInputs
    'agda-version': agdaVersion,
    'agda-stdlib-version': agdaStdlibVersion,
    'agda-stdlib-default': getFlag('agda-stdlib-default'),
    'agda-libraries': agdaLibraries,
    'agda-defaults': getOption('agda-defaults'),
    'bdist-compress-exe': getFlag('bdist-compress-exe'),
    'bdist-name': bdistName,
    'bdist-retention-days': bdistRetentionDays,
    'bdist-upload': getFlag('bdist-upload'),
    'force-build': forceBuild,
    'force-no-build': forceNoBuild,
    'force-cluster-counting': forceClusterCounting,
    'force-no-cluster-counting': forceNoClusterCounting,
    'force-optimise-heavily': forceOptimiseHeavily,
    'force-no-optimise-heavily': forceNoOptimiseHeavily,
    'ghc-version-match-exact': getFlag('ghc-version-match-exact'),
    'ghc-version-range': ghcVersionRange,
    'pre-build-hook': getOption('pre-build-hook'),

    // Specified in Haskellopts.SetupInputs
    'cabal-version': getOption('cabal-version'),
    'disable-matcher': getFlag('disable-matcher'),
    'enable-stack': getFlag('enable-stack'),
    'ghc-version': getOption('ghc-version'),
    'stack-no-global': getFlag('stack-no-global'),
    'stack-setup-ghc': getFlag('stack-setup-ghc'),
    'stack-version': getOption('stack-version'),

    // Specified in opts.BuildOptions
    'extra-include-dirs': [],
    'extra-lib-dirs': [],
    'agda-library-list': agdaLibraryList,
    'agda-default-list': []
  }
  // Print options:
  core.info(
    [
      'Options:',
      ...Object.entries({os: plat.platform, ...options}).map(entry => {
        const [key, value] = entry
        if (Array.isArray(value)) return `- ${key}: [${value.join(', ')}]`
        else return `- ${key}: ${value}`
      })
    ].join(os.EOL)
  )
  return options
}

let inputSpec:
  | Record<opts.SetupAgdaOption, {default?: string | undefined}>
  | undefined = undefined

function getDefault(
  k: opts.SetupAgdaOption,
  actionYml?: string
): string | undefined {
  if (inputSpec === undefined) {
    actionYml = actionYml ?? path.join(__dirname, '..', 'action.yml')
    inputSpec = (
      yaml.load(fs.readFileSync(actionYml, 'utf8')) as {
        inputs: Record<opts.SetupAgdaOption, {default?: string}>
      }
    ).inputs
  }
  return inputSpec[k].default
}

function parseBdistName(bdistName: string): string {
  try {
    // Join various parts of 'bdist-name', if it was defined over multiple lines.
    bdistName = bdistName.split(/\s+/g).join('').trim()
    // Attempt to parse it, to ensure errors are raised early. Caches the result.
    Mustache.parse(bdistName)
    return bdistName
  } catch (error) {
    throw Error(
      [
        `Could not parse input 'bdist-name': '${bdistName}':`,
        ensureError(error).message
      ].join(os.EOL)
    )
  }
}
