export type SimVer = number[]

export function parse(version: string): SimVer {
  return version.split('.').map(number => parseInt(number))
}

export type Ordering = -1 | 0 | 1

export function compare(version1: SimVer, version2: SimVer): Ordering {
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

export function max(versions: SimVer[]): SimVer | null {
  let maxSoFar = null
  for (const version of versions) {
    if (maxSoFar === null) {
      maxSoFar = version
    } else {
      if (compare(maxSoFar, version) === -1) {
        maxSoFar = version
      }
    }
  }
  return maxSoFar
}

export function toString(version: SimVer): string {
  return version.join('.')
}
