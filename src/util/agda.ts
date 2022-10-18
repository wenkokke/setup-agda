import * as core from '@actions/core'
import * as io from '@actions/io'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as opts from '../opts'
import * as exec from './exec'
import * as simver from './simver'

// Executable names

export const agdaBinName: string = opts.os === 'windows' ? 'agda.exe' : 'agda'

export const agdaModeBinName: string =
  opts.os === 'windows' ? 'agda-mode.exe' : 'agda-mode'

export const agdaBinNames: string[] = [agdaBinName, agdaModeBinName]

// System calls

export interface AgdaOptions {
  agdaBin: string
  agdaDataDir: string
}

function resolveAgdaOptions(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): [string, exec.ExecOptions | undefined] {
  const agdaBin = agdaOptions?.agdaBin ?? agdaBinName
  // Set 'Agda_datadir' if it is explicitly passed:
  const agdaDataDirUnset =
    options?.env?.Agda_datadir === undefined &&
    process.env.Agda_datadir !== undefined
  if (agdaOptions?.agdaDataDir !== undefined || agdaDataDirUnset) {
    const agdaDataDirDefault = path.normalize(
      path.join(path.dirname(path.resolve(agdaBin)), '..', 'data')
    )
    options = {
      ...options,
      env: {
        ...(options?.env ?? process.env),
        Agda_datadir: agdaOptions?.agdaDataDir ?? agdaDataDirDefault
      }
    }
  }
  return [agdaBin, options]
}

function parseAgdaVersionOutput(progOutput: string): string {
  if (progOutput.startsWith('Agda version ')) {
    return progOutput.substring('Agda version '.length).trim()
  } else {
    throw Error(`Could not parse Agda version: '${progOutput}'`)
  }
}

export async function agdaGetVersion(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  const versionOptions = {
    ...optionsWithDataDir,
    parseOutput: parseAgdaVersionOutput
  }
  return await exec.getVersion(agdaBin, versionOptions)
}

export async function agdaGetDataDir(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  // Support for --print-agda-dir was added in 2.6.2
  // https://github.com/agda/agda/commit/942c4a86d4941ba14d73ff173bd7d2b26e54da6c
  const agdaVersion = await agdaGetVersion(agdaOptions, options)
  if (simver.gte(agdaVersion, '2.6.2')) {
    return await agda(['--print-agda-dir'], agdaOptions, options)
  } else {
    const agdaDataDir = agdaOptions?.agdaDataDir ?? options?.env?.Agda_datadir
    if (agdaDataDir !== undefined) return agdaDataDir
    const agdaBin = agdaOptions?.agdaBin ?? (await io.which('agda'))
    return path.join(agdaBin, '..', 'data')
  }
}

export async function agda(
  args: string[],
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  return await exec.getOutput(agdaBin, args, optionsWithDataDir)
}

export async function agdaTest(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<void> {
  const versionString = await agdaGetVersion(agdaOptions)
  core.info(`Found Agda version ${versionString} on PATH`)
  const dataDir = await agdaGetDataDir(agdaOptions)
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    path.join(dataDir, 'lib', 'prim', '**', '*.agda'),
    {
      followSymbolicLinks: false,
      implicitDescendants: false,
      matchDirectories: false
    }
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compiling ${agdaFile}`)
    await agda(['-v0', agdaFile], agdaOptions, {
      ...options,
      cwd: path.join(dataDir, 'lib', 'prim')
    })
  }
}
