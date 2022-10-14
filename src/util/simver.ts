export type SimVer = number[][]

export function parse(version: string): SimVer {
  return version.split('.').map(part => part.split('_').map(parseInt))
}

export type Ordering = -1 | 0 | 1

export function compare(v1: string | SimVer, v2: string | SimVer): Ordering {
  const sv1 = typeof v1 === 'string' ? parse(v1) : v1
  const sv2 = typeof v2 === 'string' ? parse(v2) : v2
  for (let i = 0; i < Math.max(sv1.length, sv2.length); i++) {
    const sv1i = sv1.at(i) ?? []
    const sv2i = sv2.at(i) ?? []
    for (let j = 0; j < Math.max(sv1i.length, sv2i.length); j++) {
      const sv1ij = sv1i.at(j) ?? 0
      const sv2ij = sv2i.at(j) ?? 0
      if (sv1ij > sv2ij) {
        return 1
      } else if (sv1ij < sv2ij) {
        return -1
      } else {
        continue
      }
    }
  }
  return 0
}

export function lt(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  return compare(version1, version2) === -1
}

export function lte(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  const ordering = compare(version1, version2)
  return ordering === -1 || ordering === 0
}

export function gt(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  return compare(version1, version2) === 1
}

export function gte(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  const ordering = compare(version1, version2)
  return ordering === 1 || ordering === 0
}

export function eq(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  return compare(version1, version2) === 0
}

export function neq(
  version1: string | SimVer,
  version2: string | SimVer
): boolean {
  return compare(version1, version2) !== 0
}

export function toString(version: SimVer): string {
  return version.join('.')
}

export function max(versions: (string | SimVer)[]): string | null {
  const simvers = versions.map(version => {
    if (typeof version === 'string') {
      return parse(version)
    } else {
      return version
    }
  })
  let maxSimVer: SimVer | null = null
  for (const simver of simvers) {
    if (maxSimVer === null) {
      maxSimVer = simver
    } else {
      if (lt(maxSimVer, simver)) {
        maxSimVer = simver
      }
    }
  }
  return maxSimVer === null ? null : toString(maxSimVer)
}
