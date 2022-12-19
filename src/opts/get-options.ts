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
import * as exec from '../util/exec'
import {splitLines} from '../util/lines'

export default async function getOptions(
  inputs?:
    | Partial<opts.SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined),
  actionYml?: string
): Promise<opts.BuildOptions> {
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
      `Unsupported value for input \`agda-stdlib-version\`: '${agdaStdlibVersionSpec}'`
    )
  const agdaStdlibVersion: opts.AgdaStdlibVersion | 'experimental' | 'none' =
    resolveAgdaStdlibVersion(agdaVersion, agdaStdlibVersionSpec)

  // Check `ghc-version-range`:
  const ghcVersionRange = getOption('ghc-version-range')
  if (!semver.validRange(ghcVersionRange))
    throw Error('Input `ghc-version-range` is not a valid version range')

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

  // Check compatibility for `bdist-license-report`:
  const bdistLicenseReport = getFlag('bdist-license-report')
  const enableStack = getFlag('enable-stack')
  if (bdistLicenseReport && enableStack)
    throw Error(
      'Input `bdist-license-report` is incompatible with `enable-stack`'
    )
  if (bdistLicenseReport && forceNoBuild)
    throw Error(
      'Input `bdist-license-report` is incompatible with `force-no-build`'
    )

  // Parse the bdist name:
  const bdistName = parseBdistName(getOption('bdist-name'))
  const bdistRetentionDays = getOption('bdist-retention-days')
  const bdistRetentionDaysInt = parseInt(bdistRetentionDays)
  if (!(0 <= bdistRetentionDaysInt && bdistRetentionDaysInt <= 90))
    throw Error(
      [
        'Input `bdist-rentention-days` must be a number between 0 and 90.',
        `Found '${bdistRetentionDays}'.`
      ].join(' ')
    )

  // Parse agda-libraries:
  const agdaLibraries = getOption('agda-libraries')
  const agdaLibrariesListLocal: string[] = []
  const agdaLibrariesListSDist: opts.Dist[] = []
  for (const agdaLibrary of splitLines(agdaLibraries)) {
    // Check if the entry refers to a local .agda-lib file,
    // otherwise assume it refers to a .git URL:
    if (agdaLibrary.match(/\.agda-lib$/) && fs.existsSync(agdaLibrary)) {
      agdaLibrariesListLocal.push(agdaLibrary)
    } else {
      const [url, tag] = agdaLibrary.split('#', 2)
      agdaLibrariesListSDist.push({url, tag, distType: 'git'})
    }
  }
  // Parse agda-defaults:
  const agdaDefaults = getOption('agda-defaults')
  const agdaLibrariesDefault: string[] = []
  for (const agdaDefault of splitLines(agdaDefaults)) {
    agdaLibrariesDefault.push(agdaDefault)
  }
  // Add standard-library:
  const agdaStdlibDefault = getFlag('agda-stdlib-default')
  if (agdaStdlibVersion !== 'none') {
    // Add standard-library to agda-libraries-dist:
    let dist = opts.agdaStdlibSdistIndex[agdaStdlibVersion]
    if (dist === undefined)
      throw Error(
        `Unsupported value for input \`agda-stdlib-version\`: '${agdaStdlibVersion}'`
      )
    if (typeof dist === 'string') dist = {url: dist}
    if (dist.tag === undefined) dist.tag = agdaStdlibVersion
    agdaLibrariesListSDist.push(dist)
    // Add standard-library agda-libraries-default:
    if (agdaStdlibDefault) agdaLibrariesDefault.push('standard-library')
  }
  // Parse agda-executables:
  const agdaExecutables = getOption('agda-executables')
  const agdaExecutablesList: string[] = []
  for (const agdaExecutable of splitLines(agdaExecutables)) {
    if (path.isAbsolute(agdaExecutable) && fs.existsSync(agdaExecutable)) {
      agdaExecutablesList.push(agdaExecutable)
    } else {
      agdaExecutablesList.push(await exec.which(agdaExecutable, true))
    }
  }

  // Create build options:
  const options: opts.BuildOptions = {
    // Specified in opts.SetupAgdaInputs
    'agda-version': agdaVersion,
    'agda-stdlib-version': agdaStdlibVersion,
    'agda-stdlib-default': agdaStdlibDefault,
    'agda-libraries': agdaLibraries,
    'agda-defaults': agdaDefaults,
    'agda-executables': agdaExecutables,
    'bdist-compress-exe': getFlag('bdist-compress-exe'),
    'bdist-license-report': getFlag('bdist-license-report'),
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

    // Specified in opts.SetupHaskellInputs:
    'cabal-version': getOption('cabal-version'),
    'disable-matcher': getFlag('disable-matcher'),
    'enable-stack': enableStack,
    'ghc-version': getOption('ghc-version'),
    'stack-no-global': getFlag('stack-no-global'),
    'stack-setup-ghc': getFlag('stack-setup-ghc'),
    'stack-version': getOption('stack-version'),

    // Specified in opts.BuildOptions
    'extra-include-dirs': [],
    'extra-lib-dirs': [],
    'agda-libraries-list-local': agdaLibrariesListLocal,
    'agda-libraries-list-sdist': agdaLibrariesListSDist,
    'agda-libraries-default': agdaLibrariesDefault,
    'agda-executables-list': agdaExecutablesList
  }
  // Print options:
  core.info(
    [
      'Options:',
      ...Object.entries({os: plat.platform, ...options}).map(entry => {
        const [key, value] = entry
        return `- ${key}: ${JSON.stringify(value)}`
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
