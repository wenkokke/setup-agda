import * as exec from '@actions/exec'
import * as os from 'node:os'

// Helpers for system calls

export {ExecOptions} from '@actions/exec'

export async function getOutput(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  let progOutput = ''
  let progErrors = ''
  execOptions = execOptions ?? {}
  execOptions.ignoreReturnCode = true
  execOptions.listeners = {
    stdout: (data: Buffer) => {
      progOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      progErrors += data.toString()
    }
  }
  const exitCode = await exec.exec(prog, args, execOptions)
  if (exitCode === 0) {
    return progOutput
  } else {
    throw Error(
      `The call to ${prog} failed with exit code ${exitCode}:${os.EOL}${progErrors}`
    )
  }
}

// Helpers for getting versions

export interface VersionOptions extends exec.ExecOptions {
  versionFlag?: string
  parseOutput?: (progOutput: string) => string
}

export async function getVersion(
  prog: string,
  options?: VersionOptions
): Promise<string> {
  const versionFlag = options?.versionFlag ?? '--version'
  let progOutput = await getOutput(prog, [versionFlag], options)
  progOutput = progOutput.trim()
  return options?.parseOutput !== undefined
    ? options?.parseOutput(progOutput)
    : progOutput
}

// System utilities

export const brew = async (...args: string[]): Promise<string> =>
  await getOutput('brew', args)

export const brewGetVersion = async (
  formula: string
): Promise<string | undefined> => {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  const formulaVersions = await brew('list', '--formula', '--versions')
  return formulaVersions.match(formulaVersionRegExp)?.groups?.version?.trim()
}

export const chmod = async (...args: string[]): Promise<string> =>
  await getOutput('chmod', args)

export const dumpbin = async (...args: string[]): Promise<string> =>
  await getOutput('dumpbin', args)

export const installNameTool = async (...args: string[]): Promise<string> =>
  await getOutput('install_name_tool', args)

export const otool = async (...args: string[]): Promise<string> =>
  await getOutput('otool', args)

export const pacman = async (...args: string[]): Promise<string> =>
  await getOutput('pacman', args)

export const pacmanGetVersion = async (
  pkg: string
): Promise<string | undefined> => {
  const pkgInfo = await pacman('--noconfirm', '-Qs', pkg)
  const pkgVersionRegExp = /(?<version>\d[\d.]+\d)/
  const pkgVersion = pkgInfo.match(pkgVersionRegExp)?.groups?.version?.trim()
  if (pkgVersion !== undefined) return pkgVersion
  else throw Error(`Could not determine version of ${pkg}`)
}

export const patchelf = async (...args: string[]): Promise<string> =>
  await getOutput('patchelf', args)

export const pkgConfig = async (...args: string[]): Promise<string> =>
  await getOutput('pkg-config', args)

export const xattr = async (...args: string[]): Promise<string> =>
  await getOutput('xattr', args)
