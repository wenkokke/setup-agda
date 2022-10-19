import * as core from '@actions/core'
import * as os from 'node:os'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as yaml from 'js-yaml'
import {
  BuildOptions,
  SetupAgdaFlag,
  SetupAgdaInputs,
  SetupAgdaOption
} from './types'
import validateOptions from './validate-options'

export default function getOptions(
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
    'configure-options': getOption('configure-options'),
    'force-build': getFlag('force-build'),
    'force-no-build': getFlag('force-no-build'),
    'force-cluster-counting': getFlag('force-cluster-counting'),
    'force-no-cluster-counting': getFlag('force-no-cluster-counting'),
    'ghc-version-match-exact': getFlag('ghc-version-match-exact'),
    'ghc-version-range': getOption('ghc-version-range'),
    'pre-build-hook': getOption('pre-build-hook'),

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
    'extra-lib-dirs': []
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
    ].join(os.EOL)
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
