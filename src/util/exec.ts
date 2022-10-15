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
    return progOutput.trim()
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

export async function brew(...args: string[]): Promise<string> {
  return await getOutput('brew', args)
}

export async function brewGetVersion(
  formula: string
): Promise<string | undefined> {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  const formulaVersions = await brew('list', '--formula', '--versions')
  return formulaVersions.match(formulaVersionRegExp)?.groups?.version?.trim()
}

export async function chmod(...args: string[]): Promise<string> {
  return await getOutput('chmod', args)
}

export async function dumpbin(...args: string[]): Promise<string> {
  return await getOutput('dumpbin', args)
}

export async function installNameTool(...args: string[]): Promise<string> {
  return await getOutput('install_name_tool', args)
}

export async function otool(...args: string[]): Promise<string> {
  return await getOutput('otool', args)
}

export async function pacman(...args: string[]): Promise<string> {
  return await getOutput('pacman', args)
}

export async function pacmanGetVersion(
  pkg: string
): Promise<string | undefined> {
  const pkgInfo = await pacman('--noconfirm', '-Qs', pkg)
  const pkgVersionRegExp = /(?<version>\d[\d.]+\d)/
  const pkgVersion = pkgInfo.match(pkgVersionRegExp)?.groups?.version?.trim()
  if (pkgVersion !== undefined) return pkgVersion
  else throw Error(`Could not determine version of ${pkg}`)
}

export async function patchelf(...args: string[]): Promise<string> {
  return await getOutput('patchelf', args)
}

export async function pkgConfig(...args: string[]): Promise<string> {
  return await getOutput('pkg-config', args)
}

export async function pkgConfigGetInfo(
  pkg: string
): Promise<Partial<Record<string, string>>> {
  // Print info
  try {
    const pkgInfo: Partial<Record<string, string>> = {}
    const variables = (await pkgConfig('--print-variables', pkg))
      .split(os.EOL)
      .filter(variable => variable !== '')
    for (const variable of variables) {
      pkgInfo[variable] = await pkgConfig('--variable', variable, pkg)
    }
    return pkgInfo
  } catch (error) {
    return {}
  }
}

export async function sed(...args: string[]): Promise<string> {
  return await getOutput('sed', args)
}

export async function xattr(...args: string[]): Promise<string> {
  return await getOutput('xattr', args)
}
