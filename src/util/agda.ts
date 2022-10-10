import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'path'
import * as opts from '../opts'
import * as exec from './exec'
import * as os from 'os'
import distPackageInfoCache from '../package-info/Agda.json'

// Package Info

export const packageInfoCache = distPackageInfoCache as opts.PackageInfoCache

// Executable names

export const agdaExe: string = opts.os === 'windows' ? 'agda.exe' : 'agda'

export const agdaModeExe: string =
  opts.os === 'windows' ? 'agda-mode.exe' : 'agda-mode'

export const exes: string[] = [agdaExe, agdaModeExe]

// System directories

export function agdaDir(): string {
  switch (opts.os) {
    case 'linux':
    case 'macos':
      return path.join(os.homedir(), '.agda')
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}

// System calls

export interface AgdaExecOptions extends exec.ExecOptions {
  agdaPath?: string
}

export async function getSystemAgdaVersion(
  options?: AgdaExecOptions
): Promise<string> {
  return await exec.getVersion(options?.agdaPath ?? agdaExe, {
    parseOutput: output => {
      if (output.startsWith('Agda version ')) {
        return output.substring('Agda version '.length).trim()
      } else {
        throw Error(`Could not parse Agda version: '${output}'`)
      }
    },
    silent: true
  })
}

export async function getSystemAgdaDataDir(
  options?: AgdaExecOptions
): Promise<string> {
  return await execSystemAgda(['--print-agda-dir'], options)
}

export async function execSystemAgda(
  args: string[],
  options?: AgdaExecOptions
): Promise<string> {
  return await exec.execOutput(options?.agdaPath ?? agdaExe, args, options)
}

export async function testSystemAgda(options?: AgdaExecOptions): Promise<void> {
  const versionString = await getSystemAgdaVersion(options)
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await getSystemAgdaDataDir(options)
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
    core.info(`Compile ${agdaFile}`)
    await execSystemAgda(['-v2', agdaFile], {
      ...options,
      cwd: path.join(dataDir, 'lib', 'prim')
    })
  }
}
