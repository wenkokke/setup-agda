import bundledBdistIndex from '../package-info/Agda.bdist.json'

const bdistIndex = bundledBdistIndex as Partial<Record<string, string>>

export default function findBdist(pkg: string, version: string): string {
  const pkgKey = `${pkg}-${version}-${process.arch}-${process.platform}`
  const pkgUrl = bdistIndex[pkgKey]
  if (pkgUrl === undefined) throw Error(`No package for ${pkgKey}`)
  else return pkgUrl
}
