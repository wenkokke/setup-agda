import fs from 'fs-extra'
import glob from 'glob'
import * as path from 'node:path'
import {
  agdaBinDir,
  agdaDefaultsFile,
  agdaExecutablesFile,
  agdaLibrariesFile,
  agdaupDir
} from '../appdirs.js'
import exec, { ExecOptions } from '../exec.js'
import { splitLines } from '../lines.js'
import * as simver from '../simver.js'
import { agdaComponents, AgdaVersion, isAgdaVersion } from '../types.js'

export interface AgdaOptions {
  agdaPath: string
  agdaDataDir: string
}

export default async function agda(
  args: string[],
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<void> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(options)
  await exec(agdaBin, args, optionsWithDataDir)
}

agda.readLibrariesSync = (): path.ParsedPath[] => {
  if (!fs.existsSync(agdaLibrariesFile())) return []
  const librariesFileContents = fs.readFileSync(agdaLibrariesFile()).toString()
  const libraries = splitLines(librariesFileContents)
  return libraries.map((libraryPath) => path.parse(libraryPath))
}

agda.readDefaultsSync = (): string[] => {
  if (!fs.existsSync(agdaDefaultsFile())) return []
  const defaultsFileContents = fs.readFileSync(agdaDefaultsFile()).toString()
  return splitLines(defaultsFileContents)
}

agda.readExecutablesSync = (): string[] => {
  if (!fs.existsSync(agdaExecutablesFile())) return []
  const defaultsFileContents = fs.readFileSync(agdaExecutablesFile()).toString()
  return splitLines(defaultsFileContents)
}

// System calls

function resolveAgdaOptions(
  options?: Partial<AgdaOptions> & ExecOptions
): [string, ExecOptions] {
  const agdaPath = options?.agdaPath ?? agdaComponents['Agda:exe:agda'].exe
  // Set 'Agda_datadir' if it is explicitly passed:
  const agdaDataDirUndefined =
    options?.env?.Agda_datadir === undefined &&
    process.env.Agda_datadir !== undefined
  if (options?.agdaDataDir !== undefined || agdaDataDirUndefined) {
    const agdaDataDirDefault = path.normalize(
      path.join(path.dirname(path.resolve(agdaPath)), '..', 'data')
    )
    options = {
      ...options,
      env: {
        ...(options?.env ?? process.env),
        Agda_datadir: options?.agdaDataDir ?? agdaDataDirDefault
      }
    }
  }
  return [agdaPath, { ...options }]
}
agda.getVersion = async (
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<string> => {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(options)
  const { stdout } = await exec(agdaBin, ['--version'], optionsWithDataDir)
  if (stdout.startsWith('Agda version ')) {
    return stdout.substring('Agda version '.length).trim()
  } else {
    throw Error(`Could not parse Agda version: '${stdout}'`)
  }
}

agda.getDataDir = async (
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<string> => {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(options)
  // Support for --print-agda-dir was added in 2.6.2
  // https://github.com/agda/agda/commit/942c4a86d4941ba14d73ff173bd7d2b26e54da6c
  const agdaVersion = await agda.getVersion(options)
  if (simver.gte(agdaVersion, '2.6.2')) {
    const { stdout } = await exec(
      agdaBin,
      ['--print-agda-dir'],
      optionsWithDataDir
    )
    return stdout
  } else {
    const agdaDataDir = options?.agdaDataDir ?? options?.env?.Agda_datadir
    if (agdaDataDir !== undefined) return agdaDataDir
    let agdaPath = options?.agdaPath ?? null
    if (agdaPath === null) {
      agdaPath = await exec.which(agdaComponents['Agda:exe:agda'].exe, {
        path: options?.env?.PATH
      })
      if (agdaPath === null) {
        throw Error(
          `Could not find Agda executable; did you add Agda to the PATH?`
        )
      }
    }
    return path.join(path.basename(agdaPath), '..', 'data')
  }
}

agda.getInstalledVersions = (): AgdaVersion[] => {
  return glob
    .sync(path.join(agdaupDir(), 'agda', '*'))
    .flatMap((dir: string): AgdaVersion[] => {
      const agdaVersion = path.basename(dir)
      return isAgdaVersion(agdaVersion) ? [agdaVersion] : []
    })
}

agda.getSetVersion = (): AgdaVersion | null => {
  const setAgda = path.join(agdaBinDir(), agdaComponents['Agda:exe:agda'].exe)
  if (fs.existsSync(setAgda)) {
    const realAgda = fs.realpathSync(setAgda)
    const realAgdaBinDir = path.dirname(realAgda)
    const realAgdaInstallDir = path.dirname(realAgdaBinDir)
    const realAgdaVersion = path.basename(realAgdaInstallDir)
    if (isAgdaVersion(realAgdaVersion)) {
      return realAgdaVersion
    } else {
      return null
    }
  } else {
    return null
  }
}
