import * as core from '@actions/core'
import * as os from 'node:os'
import * as exec from '../exec'
import * as opts from '../../opts'

export async function pkgConfig(...args: string[]): Promise<string> {
  return await exec.getOutput('pkg-config', args)
}

export interface PkgConfig {
  name: string
  variables: Partial<Record<string, string>>
  requires: PkgConfig[]
}

async function pkgConfigGetList(
  name: string,
  listName: string
): Promise<string[]> {
  return (await pkgConfig(`--print-${listName}`, name))
    .split(os.EOL)
    .map(variableName => variableName.trim())
    .filter(variableName => variableName !== '')
}

export async function pkgConfigGetVersion(name: string): Promise<string> {
  return (await pkgConfig('--modversion', name)).trim()
}

export async function pkgConfigGetVariable(
  name: string,
  variable: string
): Promise<string> {
  return (await pkgConfig('--variable', variable, name)).trim()
}

export async function pkgConfigGetInfo(
  name: string,
  seen?: string[]
): Promise<PkgConfig> {
  if (seen?.includes(name)) {
    throw Error(`Cyclic dependency: ${seen.join(', ')}`)
  } else {
    const variables: Partial<Record<string, string>> = {}
    for (const vn of await pkgConfigGetList(name, 'variables'))
      variables[vn] = await pkgConfigGetVariable(name, vn)
    const requires: PkgConfig[] = []
    for (const rn of await pkgConfigGetList(name, 'requires'))
      requires.push(await pkgConfigGetInfo(rn, [...(seen ?? []), name]))
    return {name, variables, requires}
  }
}

export function addPkgConfigPath(pkgConfigDir: string): void {
  const pathSep = opts.platform === 'win32' ? ';' : ':'
  const pkgConfigPath = process.env.PKG_CONFIG_PATH ?? ''
  const pkgConfigDirs = pkgConfigPath
    .split(pathSep)
    .map(dir => dir.trim())
    .filter(dir => dir !== '')
  core.exportVariable(
    'PKG_CONFIG_PATH',
    [pkgConfigDir, ...pkgConfigDirs].join(pathSep)
  )
}
