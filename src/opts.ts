import appDirs from 'appdirsjs'
import * as fs from 'fs'
import * as semver from 'semver'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as process from 'process'
import * as haskell from './util/haskell'

// Setup options from actions.yml:

export type SetupOptionKey =
  | 'agda-version'
  | 'ghc-version-range'
  | 'upload-artifact'
  | haskell.SetupOptionKey

export const setupOptionKeys: SetupOptionKey[] = (
  ['agda-version', 'ghc-version-range', 'upload-artifact'] as SetupOptionKey[]
).concat(haskell.setupOptionKeys)

export type SetupOptions = Record<SetupOptionKey, string>

export type SetupOptionDefaults = Partial<
  Record<SetupOptionKey, {default?: string}>
>

export const setupOptionDefaults: SetupOptionDefaults = (
  yaml.load(
    fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
  ) as {inputs: SetupOptionDefaults}
).inputs

export function validSetupOptions(
  options?: Partial<SetupOptions>
): Required<SetupOptions> {
  // Set defaults:
  options = options ?? {}
  for (const key of setupOptionKeys) {
    if (options[key] === undefined) {
      setupOptionDefaults[key]?.default ?? ''
    }
  }
  // Was 'agda-version' set to 'nightly'?
  if (options['agda-version'] === 'nightly') {
    throw Error(`Value 'nightly' for 'agda-version' is no longer supported.`)
  }
  // Was 'ghc-version' set?
  if (options['ghc-version'] !== 'latest') {
    throw Error(
      `Input 'ghc-version' is unsupported, found ${options['ghc-version']}. Use 'ghc-version-range'.`
    )
  }
  // Was 'stack-no-global' set?
  if (options['stack-no-global'] !== '') {
    throw Error(
      `Input 'stack-no-global' is unsupported, found ${options['stack-no-global']}.`
    )
  }
  // Is 'ghc-version-range' a valid version range?
  if (!semver.validRange(options['ghc-version-range'])) {
    throw Error(
      `Input 'ghc-version-range' is not a valid version range, found ${options['ghc-version-range']}`
    )
  }
  return options as Required<SetupOptions>
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

// Helpers for determining the Agda directories across platforms:

const agdaDirs = appDirs({appName: 'agda'})

export const cacheDir: string = agdaDirs.cache

export function installDir(version: string, ...paths: string[]): string {
  return path.join(agdaDirs.data, version, ...paths)
}
