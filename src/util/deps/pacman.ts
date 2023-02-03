import exec, { ExecOptions } from '../exec.js'
import msys from './msys.js'

export default async function pacman(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  const pacmanPath = await pacman.which()
  await exec(pacmanPath ?? 'pacman', args, options)
}

pacman.which = async (): Promise<string | null> => {
  const msysPacmanPath = await exec.which('pacman', { path: msys.path })
  if (msysPacmanPath !== null) {
    return msysPacmanPath
  } else {
    return await exec.which('pacman')
  }
}

pacman.exists = async (): Promise<boolean> => (await pacman.which()) !== null

pacman.getVersion = async (
  pkg: string,
  options?: ExecOptions
): Promise<string | undefined> => {
  const pacmanPath = await pacman.which()
  const { stdout: pkgInfo } = await exec(
    pacmanPath ?? 'pacman',
    ['--noconfirm', '-Qs', pkg],
    options
  )
  const pkgVersionRegExp = /(?<version>\d[\d.]+\d)/
  const pkgVersion = pkgInfo.match(pkgVersionRegExp)?.groups?.version?.trim()
  if (pkgVersion !== undefined) return pkgVersion
  else throw Error(`Could not determine version of ${pkg}`)
}
