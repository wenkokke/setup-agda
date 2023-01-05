import * as logging from '../util/logging'
import Mustache from 'mustache'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import ensureError from '../util/ensure-error'
import * as exec from '../util/exec'
import {splitLines} from '../util/lines'
import {platform} from './platform'
import resolveAgdaStdlibVersion from './resolve-agda-stdlib-version'
import resolveAgdaVersion from './resolve-agda-version'
import * as opts from './types'
import action from '../data/action.json'
import resolveGhcVersion from './resolve-ghc-version'

export default async function getOptions(
  inputs?:
    | Partial<opts.SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined)
): Promise<opts.BuildOptions> {
  function getOption(k: opts.SetupAgdaOption): string {
    const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs?.[k]
    const inputValue = rawInputValue?.trim() ?? getDefault(k) ?? ''
    logging.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`)
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
    logging.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`)
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

  // Resolve GHC version:
  const ghcVersionSpec = getOption('ghc-version')
  const ghcVersion = resolveGhcVersion(agdaVersion, ghcVersionSpec)

  // Check `stack-no-global`:
  const stackNoGlobal = getFlag('stack-no-global')
  if (stackNoGlobal)
    throw Error('Value `true` for input `stack-no-global` is unsupported.')

  // Check for contradictory options:
  const [forceBuild, forceNoBuild] = getFlagPair(
    'force-build',
    'force-no-build'
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
    let dist = opts.agdaStdlibInfo[agdaStdlibVersion]?.source
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
    'pre-build-hook': getOption('pre-build-hook'),
    configuration: resolveConfiguration(
      agdaVersion,
      getOption('configuration')
    ),

    // Specified in opts.SetupHaskellInputs:
    'cabal-version': getOption('cabal-version'),
    'disable-matcher': getFlag('disable-matcher'),
    'enable-stack': getFlag('enable-stack'),
    'ghc-version': ghcVersion,
    'stack-no-global': stackNoGlobal,
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
  logging.info(
    [
      'Options:',
      ...Object.entries({os: platform, ...options}).map(entry => {
        const [key, value] = entry
        return `- ${key}: ${JSON.stringify(value)}`
      })
    ].join(os.EOL)
  )
  return options
}

const inputSpec: Record<opts.SetupAgdaOption, {default?: string}> =
  action.inputs

function getDefault(k: opts.SetupAgdaOption): string | undefined {
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

function resolveConfiguration(
  agdaVersion: opts.AgdaVersion | 'HEAD' | 'nightly',
  configuration: string
): string {
  switch (agdaVersion) {
    case 'HEAD':
      return ''
    case 'nightly':
      return ''
    default: {
      const clean = (str: string): string =>
        splitLines(str)
          .map(ln => ln.trim())
          .join(' ')
      switch (configuration) {
        case 'none':
          return ''
        case 'recommended': {
          const {configuration} = opts.agdaInfo[agdaVersion]
          if (configuration === undefined) return ''
          else if (typeof configuration === 'string')
            return clean(configuration)
          else return clean(configuration[platform])
        }
        default:
          return clean(configuration)
      }
    }
  }
}
