import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import * as haskell from './util/haskell'
import appDirs from 'appdirsjs'
import * as process from 'process'

// Setup options from actions.yml:

export type SetupOptionKey = 'agda-version' | haskell.SetupOptionKey

export const setupOptionKeys: SetupOptionKey[] = [
  'agda-version' as SetupOptionKey
].concat(haskell.setupOptionKeys)

export type SetupOptions = Record<SetupOptionKey, string>

export type SetupOptionDefaults = Partial<
  Record<SetupOptionKey, {default?: string}>
>

export const setupOptionDefaults: SetupOptionDefaults = (
  yaml.load(
    fs.readFileSync(path.join(__dirname, '..', 'action.yml'), 'utf8')
  ) as {inputs: SetupOptionDefaults}
).inputs

export function setDefaults(
  options?: Partial<SetupOptions>
): Required<SetupOptions> {
  options = options ?? {}
  for (const key of setupOptionKeys) {
    if (options[key] === undefined) {
      setupOptionDefaults[key]?.default ?? ''
    }
  }
  return options as Required<SetupOptions>
}

// Other options:

export type Platform = 'linux' | 'darwin' | 'win32'

export const platform = process.platform as Platform

const agdaDirs = appDirs({appName: 'agda'})

export const cacheDir: string = agdaDirs.cache

export const installDir: string = agdaDirs.data
