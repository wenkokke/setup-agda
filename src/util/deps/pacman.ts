import pick from 'object.pick'
import exec, { ExecOptions } from '../exec.js'
import msys from './msys.js'

export default async function pacman(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  const pacmanPath = await pacman.which()
  return await exec(pacmanPath ?? 'pacman', args, options)
}

pacman.which = async (): Promise<string | null> => {
  const pacmanPath = await exec.which('pacman')
  if (pacmanPath !== null) {
    return pacmanPath
  } else {
    return await exec.which('pacman', pick(msys, ['path']))
  }
}

pacman.existsSync = (): boolean => pacman.which() !== null

pacman.getVersion = async (
  pkg: string,
  options?: ExecOptions
): Promise<string | undefined> => {
  const pkgInfo = await pacman(['--noconfirm', '-Qs', pkg], options)
  const pkgVersionRegExp = /(?<version>\d[\d.]+\d)/
  const pkgVersion = pkgInfo.match(pkgVersionRegExp)?.groups?.version?.trim()
  if (pkgVersion !== undefined) return pkgVersion
  else throw Error(`Could not determine version of ${pkg}`)
}
