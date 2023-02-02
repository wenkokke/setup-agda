import * as fs from 'node:fs'
import * as path from 'node:path'
import {
  agdaDefaultsFile,
  agdaExecutablesFile,
  agdaLibrariesFile
} from '../appdirs.js'
import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'
import { splitLines } from '../lines.js'
import * as simver from '../simver.js'
import { agdaComponents } from '../types.js'

export interface AgdaOptions {
  agdaPath: string
  agdaDataDir: string
}

export default async function agda(
  args: string[],
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(options)
  return await exec.exec(agdaBin, args, optionsWithDataDir)
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
): [string, ExecOptions | undefined] {
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
  return [agdaPath, options]
}
agda.getVersion = async (
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<string> => {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(options)
  const versionOptions = {
    ...optionsWithDataDir,
    parseOutput: (progOutput: string): string => {
      if (progOutput.startsWith('Agda version '))
        return progOutput.substring('Agda version '.length).trim()
      else throw Error(`Could not parse Agda version: '${progOutput}'`)
    }
  }
  return await exec.getVersion(agdaBin, versionOptions)
}

agda.getDataDir = async (
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<string> => {
  // Support for --print-agda-dir was added in 2.6.2
  // https://github.com/agda/agda/commit/942c4a86d4941ba14d73ff173bd7d2b26e54da6c
  const agdaVersion = await agda.getVersion(options)
  if (simver.gte(agdaVersion, '2.6.2')) {
    return await agda(['--print-agda-dir'], options)
  } else {
    const agdaDataDir = options?.agdaDataDir ?? options?.env?.Agda_datadir
    if (agdaDataDir !== undefined) return agdaDataDir
    const agdaBin =
      options?.agdaPath ??
      (await exec.which(agdaComponents['Agda:exe:agda'].exe))
    return path.join(path.basename(agdaBin), '..', 'data')
  }
}
