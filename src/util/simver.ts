export type SimVer = number[]

export function parse(version: string): SimVer {
  return version.split('.').map(number => parseInt(number))
}

export type Ordering = -1 | 0 | 1

export function compare(
  version1: string | SimVer,
  version2: string | SimVer
): Ordering {
  if (typeof version1 === 'string') {
    version1 = parse(version1)
  }
  if (typeof version2 === 'string') {
    version2 = parse(version2)
  }
  for (let i = 0; i < Math.max(version1.length, version2.length); i++) {
    const part1 = version1.at(i) ?? 0
    const part2 = version2.at(i) ?? 0
    if (part1 > part2) {
      return 1
    } else if (part1 < part2) {
      return -1
    } else {
      continue
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
