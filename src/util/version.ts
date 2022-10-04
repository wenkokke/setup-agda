import assert from 'assert'
import * as semver from 'semver'
import versions from '../versions.json'

function compareNumber(n1: number, n2: number): number {
  if (n1 < n2) {
    return -1
  } else if (n1 > n2) {
    return 1
  } else {
    return 0
  }
}

function toStringBuildDate(build?: Date): string | undefined {
  if (build === undefined) {
    return undefined
  } else {
    return [
      build.getFullYear().toString().padStart(4, '0'),
      build.getMonth().toString().padStart(2, '0'),
      build.getMonth().toString().padStart(2, '0')
    ].join('')
  }
}

export function parse(versionString: string): AgdaVersionParts {
  const versionParts = versionString.split('.')
  const errorMessage = `Agda version numbers have the form '2.X.Y[.Z[.YYYY0M0D]]', found ${versionString}'`
  assert(
    3 <= versionParts.length &&
      versionParts.length <= 5 &&
      versionParts.at(0) === '2' &&
      (versionParts.at(4) === undefined || versionParts.at(4)?.length === 8),
    errorMessage
  )
  const major = ((): number => {
    const majorString = versionParts.at(0)
    if (majorString !== undefined) {
      return parseInt(majorString)
    } else {
      throw Error(errorMessage)
    }
  })()
  const minor = ((): number => {
    const minorString = versionParts.at(1)
    if (minorString !== undefined) {
      return parseInt(minorString)
    } else {
      throw Error(errorMessage)
    }
  })()
  const micro = ((): number | undefined => {
    const microString = versionParts.at(2)
    if (microString !== undefined) {
      return parseInt(microString)
    } else {
      return undefined
    }
  })()
  const patch = ((): number | undefined => {
    const patchString = versionParts.at(3)
    if (patchString !== undefined) {
      return parseInt(patchString)
    } else {
      return undefined
    }
  })()
  const build = ((): Date | undefined => {
    const buildString = versionParts.at(4)
    if (buildString !== undefined) {
      const buildYear = parseInt(buildString.substring(0, 4))
      const buildMonth = parseInt(buildString.substring(4, 6))
      const buildDay = parseInt(buildString.substring(6, 8))
      return new Date(buildYear, buildMonth, buildDay)
    }
  })()
  return {major, minor, micro, patch, build}
}

export interface AgdaVersionParts {
  readonly major: number
  readonly minor: number
  readonly micro?: number
  readonly patch?: number
  readonly build?: Date
}

export class AgdaVersion implements AgdaVersionParts {
  readonly major: number
  readonly minor: number
  readonly micro?: number
  readonly patch?: number
  readonly build?: Date

  constructor(versionStringOrParts: string | AgdaVersionParts) {
    if (typeof versionStringOrParts === 'string') {
      versionStringOrParts = parse(versionStringOrParts)
    }
    this.major = versionStringOrParts.major
    this.minor = versionStringOrParts.minor
    this.micro = versionStringOrParts.micro
    this.patch = versionStringOrParts.patch
    this.build = versionStringOrParts.build
  }

  compare(that: AgdaVersion): number {
    const compareParts = [
      compareNumber(this.major, that.major),
      compareNumber(this.minor, that.minor),
      compareNumber(this.micro ?? 0, that.micro ?? 0),
      compareNumber(this.patch ?? 0, that.patch ?? 0),
      compareNumber(
        this.build?.getFullYear() ?? 0,
        that.build?.getFullYear() ?? 0
      ),
      compareNumber(this.build?.getMonth() ?? 0, that.build?.getMonth() ?? 0),
      compareNumber(this.build?.getDay() ?? 0, that.build?.getDay() ?? 0)
    ]
    for (const comparePart of compareParts) {
      if (comparePart !== 0) {
        return comparePart
      }
    }
    return 0
  }

  toString(): string {
    return [
      this.major.toString(),
      this.minor.toString(),
      this.micro?.toString(),
      this.patch?.toString(),
      toStringBuildDate(this.build)
    ]
      .filter(value => value !== undefined)
      .join('.')
  }

  satisfies(spec: AgdaVersion): boolean {
    return (
      spec.major === this.major &&
      spec.minor === this.minor &&
      (spec.micro === undefined || spec.micro === this.micro) &&
      (spec.patch === undefined || spec.patch === this.patch) &&
      (spec.build === undefined || spec.build === this.build)
    )
  }
}

export interface AgdaBuildData {
  readonly version: string | AgdaVersion
  readonly ghc?: {'tested-with': string[] | semver.SemVer[]}
  readonly tag: string
  readonly supported?: boolean
}

export class AgdaBuilder implements AgdaBuildData {
  _version: string | AgdaVersion
  readonly tag: string
  _ghc?: {'tested-with': string[] | semver.SemVer[]}
  readonly _supported?: boolean

  constructor(buildData: AgdaBuildData) {
    this._version = buildData.version
    this.tag = buildData.tag
    this._ghc = buildData.ghc
    this._supported = buildData.supported
  }

  get version(): AgdaVersion {
    if (typeof this._version === 'string') {
      this._version = new AgdaVersion(this._version)
    }
    return this._version
  }

  get ghc(): {'tested-with': semver.SemVer[]} | undefined {
    if (this._ghc !== undefined) {
      return {
        'tested-with': this._ghc['tested-with'].map(versionString => {
          const version = semver.parse(versionString, {loose: true})
          if (version === null) {
            throw Error(`Could not parse GHC version ${versionString}`)
          } else {
            return version
          }
        })
      }
    }
  }

  get supported(): boolean {
    return this._supported ?? true
  }

  testedWith(version: semver.SemVer): boolean {
    return this.ghc?.['tested-with'].includes(version) ?? false
  }

  maxGhcVersionSatisfying(range?: string | semver.Range): semver.SemVer | null {
    const ghcVersions = this.ghc?.['tested-with'] ?? []
    if (range !== undefined) {
      return semver.maxSatisfying(ghcVersions, range)
    } else {
      let latestGhcVersion = null
      for (const ghcVersion of ghcVersions) {
        if (
          latestGhcVersion === null ||
          latestGhcVersion.compare(ghcVersion) === -1
        ) {
          latestGhcVersion = ghcVersion
        }
      }
      return latestGhcVersion
    }
  }
}

export const allBuildData = versions.agda as AgdaBuildData[]
export const allBuilders = allBuildData
  .map(buildData => new AgdaBuilder(buildData))
  .filter(builder => builder.supported)

export function findBuilder(spec?: AgdaVersion): AgdaBuilder | null {
  let builders = (versions.agda as AgdaBuildData[]).map(
    buildData => new AgdaBuilder(buildData)
  )

  // If range is specified, filter all Agda versions by the range:
  if (spec !== undefined) {
    builders = builders.filter(builder => {
      return builder.version.satisfies(spec)
    })
  }

  // Find the latest matching version:
  let latest: AgdaBuilder | null = null
  for (const builder of builders) {
    if (latest === null) {
      latest = builder
    } else {
      if (latest.version.compare(builder.version) === -1) {
        latest = builder
      }
    }
  }
  return latest
}
