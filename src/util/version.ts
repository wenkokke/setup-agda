import * as semver from 'semver'
import versions from '../versions.json'

type Wildcard = '*'

const wildcard: Wildcard = '*'

export type VersionNumericField = 'major' | 'minor' | 'micro' | 'patch'

export type VersionBuildField = 'buildYear' | 'buildMonth' | 'buildDate'

const versionNumericFields: VersionNumericField[] = [
  'major',
  'minor',
  'micro',
  'patch'
]

export interface AgdaVersionSpecData {
  major: number | Wildcard
  minor: number | Wildcard
  micro: number | Wildcard
  patch: number | Wildcard
  readonly buildYear?: number
  readonly buildMonth?: number
  readonly buildDate?: number
  build?: Date
  releaseTag?: string
}

export interface AgdaVersionData extends AgdaVersionSpecData {
  major: number
  minor: number
  micro: number
  patch: number
  readonly buildYear: number
  readonly buildMonth: number
  readonly buildDate: number
  build: Date
  releaseTag: string
}

function nextUndefined(
  parts: Partial<AgdaVersionSpecData>
): VersionNumericField | null {
  for (const field of versionNumericFields) {
    if (parts[field] === undefined) {
      return field
    }
  }
  return null
}

export function parse(versionString: string): Readonly<AgdaVersionSpecData> {
  const matchReleaseTag = versionString.match(
    '^(?<versionString>[\\d\\.]+)-(?<releaseTag>[\\w\\d]+)$'
  )
  let releaseTag: string | undefined
  if (
    matchReleaseTag !== null &&
    matchReleaseTag.groups?.versionString !== undefined &&
    matchReleaseTag.groups?.releaseTag !== undefined
  ) {
    versionString = matchReleaseTag.groups?.versionString
    releaseTag = matchReleaseTag.groups?.releaseTag
  }
  const versionStringParts = versionString.split('.')
  const errorMessage = `Agda version numbers have the form '2.X.Y[.Z][.YYYY0M0D][-tag]', found ${versionString}'`
  const versionParts: Partial<AgdaVersionSpecData> = {releaseTag}
  // Iterate over the version parts:
  for (const versionStringPart of versionStringParts) {
    // If we have seen the major and minor numbers, start looking for build dates:
    if (versionStringPart.length === 8) {
      const buildYear = parseInt(versionStringPart.substring(0, 4))
      const buildMonth = parseInt(versionStringPart.substring(4, 6)) - 1
      const buildDate = parseInt(versionStringPart.substring(6, 8))
      versionParts.build = new Date(buildYear, buildMonth, buildDate)
    } else {
      const field = nextUndefined(versionParts)
      if (field !== null) {
        if (versionStringPart === wildcard) {
          versionParts[field] = wildcard
        } else {
          versionParts[field] = parseInt(versionStringPart)
        }
      } else {
        throw Error(errorMessage)
      }
    }
  }
  for (const field of versionNumericFields) {
    versionParts[field] = versionParts[field] ?? 0
  }
  return versionParts as AgdaVersionSpecData
}

export class AgdaVersionSpec implements Readonly<AgdaVersionSpecData> {
  readonly major: number | Wildcard
  readonly minor: number | Wildcard
  readonly micro: number | Wildcard
  readonly patch: number | Wildcard
  readonly build?: Date
  readonly releaseTag?: string

  constructor(versionStringOrParts: string | AgdaVersionSpecData) {
    if (typeof versionStringOrParts === 'string') {
      versionStringOrParts = parse(versionStringOrParts)
    }
    this.major = versionStringOrParts.major
    this.minor = versionStringOrParts.minor
    this.micro = versionStringOrParts.micro
    this.patch = versionStringOrParts.patch
    this.build = versionStringOrParts.build
    this.releaseTag = versionStringOrParts.releaseTag
  }

  get buildYear(): number | undefined {
    if (this.build === undefined) {
      return undefined
    } else {
      return this.build.getFullYear()
    }
  }

  get buildMonth(): number | undefined {
    if (this.build === undefined) {
      return undefined
    } else {
      return this.build.getMonth() + 1
    }
  }

  get buildDate(): number | undefined {
    if (this.build === undefined) {
      return undefined
    } else {
      return this.build.getDate()
    }
  }

  get buildString(): string | undefined {
    if (
      this.buildYear !== undefined &&
      this.buildMonth !== undefined &&
      this.buildDate !== undefined
    ) {
      return [
        this.buildYear.toString().padStart(4, '0'),
        this.buildMonth.toString().padStart(2, '0'),
        this.buildDate.toString().padStart(2, '0')
      ]
        .filter(value => value !== undefined)
        .join('')
    } else {
      return undefined
    }
  }

  get version(): string {
    return [
      this.major,
      this.minor,
      this.micro,
      this.patch,
      this.buildString,
      this.releaseTag
    ]
      .filter(value => value !== undefined && value !== wildcard)
      .join('.')
  }

  toString(): string {
    return this.version
  }
}

export class AgdaVersion extends AgdaVersionSpec {
  readonly major: number
  readonly minor: number
  readonly micro: number
  readonly patch: number
  readonly build?: Date
  readonly releaseTag?: string

  constructor(versionStringOrParts: string | AgdaVersionData) {
    super(versionStringOrParts)
    this.major = super.major === wildcard ? 0 : super.major
    this.minor = super.minor === wildcard ? 0 : super.minor
    this.micro = super.micro === wildcard ? 0 : super.micro
    this.patch = super.patch === wildcard ? 0 : super.patch
  }
  compare(that: AgdaVersion): number {
    for (const field of versionNumericFields) {
      const thisPart = this[field] ?? 0
      const thatPart = that[field] ?? 0
      if (thisPart < thatPart) {
        return -1
      } else if (thisPart > thatPart) {
        return 1
      } else {
        continue
      }
    }
    return 0
  }

  satisfies(spec?: AgdaVersionSpec): boolean {
    if (spec === undefined) {
      return true
    } else {
      return (
        (spec.major === wildcard || spec.major === this.major) &&
        (spec.minor === wildcard || spec.minor === this.minor) &&
        (spec.micro === wildcard || spec.micro === this.micro) &&
        (spec.patch === wildcard || spec.patch === this.patch) &&
        (spec.build === undefined || spec.build === this.build) &&
        (spec.releaseTag === undefined || spec.releaseTag === this.releaseTag)
      )
    }
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

  isTestedWithGhcVersion(version: semver.SemVer): boolean {
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

export function findBuilder(spec?: AgdaVersionSpec): AgdaBuilder | null {
  // Get all builders that satsify the spec:
  const builders = (versions.agda as AgdaBuildData[])
    .map(buildData => new AgdaBuilder(buildData))
    .filter(builder => builder.version.satisfies(spec))

  // Get the latest builder:
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

export function resolveAgdaVersion(
  versionStringOrParts?: string | AgdaVersionSpecData
): AgdaBuilder {
  // Parse the version specification
  let agdaVer: AgdaVersionSpec | undefined
  if (versionStringOrParts !== undefined && versionStringOrParts !== 'latest') {
    agdaVer = new AgdaVersionSpec(versionStringOrParts)
  }

  // Find the appropriate builder:
  const agdaBuilder = findBuilder(agdaVer)
  if (agdaBuilder === null) {
    throw Error(
      `Could not resolve Agda version '${versionStringOrParts}' to any known version`
    )
  } else {
    return agdaBuilder
  }
}
