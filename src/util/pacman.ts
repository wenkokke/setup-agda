import * as exec from './exec'

export async function pacman(...args: string[]): Promise<string> {
  return await exec.getOutput('pacman', args)
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
