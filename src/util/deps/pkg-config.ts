import * as os from 'node:os'
import * as exec from '../exec.js'
import { ExecOptions, which } from '../exec.js'
import { platform } from '../platform.js'
import msys from './msys.js'

export interface PkgConfig {
  name: string
  variables: Partial<Record<string, string>>
  requires: PkgConfig[]
}

export default async function pkgConfig(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  const pkgConfigPath = pkgConfig.which() ?? 'pkg-config'
  return await exec.getOutput(pkgConfigPath, args, options)
}

pkgConfig.which = (): string | null => {
  return (
    which.sync('pkg-config', { nothrow: true, path: msys.path }) ??
    which.sync('pkg-config', { nothrow: true })
  )
}

pkgConfig.existsSync = (): boolean => pkgConfig.which() !== null

async function getList(
  name: string,
  listName: string,
  options?: ExecOptions
): Promise<string[]> {
  return (await pkgConfig([`--print-${listName}`, name], options))
    .split(os.EOL)
    .map((variableName) => variableName.trim())
    .filter((variableName) => variableName !== '')
}

pkgConfig.getVersion = async (
  name: string,
  options?: ExecOptions
): Promise<string> => {
  return (await pkgConfig(['--modversion', name], options)).trim()
}

pkgConfig.getVariable = async (
  name: string,
  variable: string,
  options?: ExecOptions
): Promise<string> => {
  return (await pkgConfig(['--variable', variable, name], options)).trim()
}

pkgConfig.getInfo = async (
  name: string,
  seen?: string[],
  options?: ExecOptions
): Promise<PkgConfig> => {
  if (seen?.includes(name)) {
    throw Error(`Cyclic dependency: ${seen.join(', ')}`)
  } else {
    const variables: Partial<Record<string, string>> = {}
    for (const vn of await getList(name, 'variables', options))
      variables[vn] = await pkgConfig.getVariable(name, vn, options)
    const requires: PkgConfig[] = []
    for (const rn of await getList(name, 'requires', options))
      requires.push(
        await pkgConfig.getInfo(rn, [...(seen ?? []), name], options)
      )
    return { name, variables, requires }
  }
}

const pathSep = platform === 'windows' ? ';' : ':'

pkgConfig.joinPath = (pkgConfigDirs: string[]): string => {
  return pkgConfigDirs.join(pathSep)
}

pkgConfig.splitPath = (pkgConfigPath?: string): string[] => {
  return (
    pkgConfigPath
      ?.split(pathSep)
      ?.map((dir) => dir.trim())
      ?.filter((dir) => dir !== '') ?? []
  )
}
