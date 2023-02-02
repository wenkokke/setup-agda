import * as exec from '../exec.js'
import { ExecOptions, which } from '../exec.js'
import msys from './msys.js'

export default async function pacman(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  const pacmanPath = pacman.which() ?? 'pacman'
  return await exec.exec(pacmanPath, args, options)
}

pacman.which = (): string | null => {
  return (
    which.sync('pacman', { nothrow: true, path: msys.path }) ??
    which.sync('pacman', { nothrow: true })
  )
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
