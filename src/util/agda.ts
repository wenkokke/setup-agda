import * as path from 'node:path'
import * as opts from '../opts'
import * as exec from './exec'

// Executable names

export const agdaBinName: string = opts.os === 'windows' ? 'agda.exe' : 'agda'

export const agdaModeBinName: string =
  opts.os === 'windows' ? 'agda-mode.exe' : 'agda-mode'

export const agdaBinNames: string[] = [agdaBinName, agdaModeBinName]

// System calls

export interface AgdaOptions {
  readonly agdaBin: string
  readonly agdaDataDir: string
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

export async function getSystemAgdaVersion(
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

export async function getSystemAgdaDataDir(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  return await execSystemAgda(['--print-agda-dir'], agdaOptions, options)
}

export async function execSystemAgda(
  args: string[],
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  return await exec.getoutput(agdaBin, args, optionsWithDataDir)
}
