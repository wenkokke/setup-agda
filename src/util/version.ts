import * as semver from 'semver'
import versions from '../versions.json'

export type AgdaVersionPartKeys =
  | 'major'
  | 'minor'
  | 'micro'
  | 'patch'
  | 'buildYear'
  | 'buildMonth'
  | 'buildDate'

const agdaVersionPartKeys: AgdaVersionPartKeys[] = [
  'major',
  'minor',
  'micro',
  'patch',
  'buildYear',
  'buildMonth',
  'buildDate'
]

export interface AgdaVersionParts {
  major: number
  minor: number
  micro?: number
  patch?: number
  build?: Date
  buildYear?: number
  buildMonth?: number
  buildDate?: number
  releaseTag?: string
}

function nextUndefined(
  parts: Partial<AgdaVersionParts>
): AgdaVersionPartKeys | undefined {
  for (const key of [
    'major',
    'minor',
    'micro',
    'patch'
  ] as AgdaVersionPartKeys[]) {
    if (parts[key] === undefined) {
      return key
    }
  }
}

export function parse(versionString: string): Readonly<AgdaVersionParts> {
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
  const versionParts: Partial<AgdaVersionParts> = {releaseTag}
  // Iterate over the version parts:
  for (const versionStringPart of versionStringParts) {
    // If we have seen the major and minor numbers, start looking for build dates:
    if (versionStringPart.length === 8) {
      const buildYear = parseInt(versionStringPart.substring(0, 4))
      const buildMonth = parseInt(versionStringPart.substring(4, 6)) - 1
      const buildDate = parseInt(versionStringPart.substring(6, 8))
      versionParts.build = new Date(buildYear, buildMonth, buildDate)
    } else {
      const key = nextUndefined(versionParts)
      if (key !== undefined) {
        versionParts[key] = parseInt(versionStringPart)
      } else {
        throw Error(errorMessage)
      }
    }
  }
  return versionParts as AgdaVersionParts
}

export class AgdaVersion implements Readonly<AgdaVersionParts> {
  readonly major: number
  readonly minor: number
  readonly micro?: number
  readonly patch?: number
  readonly build?: Date
  readonly releaseTag?: string

  constructor(versionStringOrParts: string | AgdaVersionParts) {
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
    return this.build?.getFullYear()
  }

  get buildMonth(): number | undefined {
    if (this.build !== undefined) {
      return this.build.getMonth() + 1
    }
  }

  get buildDate(): number | undefined {
    return this.build?.getDate()
  }

  compare(that: AgdaVersion): number {
    for (const key of agdaVersionPartKeys) {
      const thisPart = this[key] ?? 0
      const thatPart = that[key] ?? 0
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
    }
  }

  get version(): string {
    return [
      this.major.toString(),
      this.minor.toString(),
      this.micro?.toString(),
      this.patch?.toString(),
      this.buildString,
      this.releaseTag
    ]
      .filter(value => value !== undefined)
      .join('.')
  }

  toString(): string {
    return this.version
  }

  satisfies(spec?: AgdaVersion): boolean {
    if (spec === undefined) {
      return true
    } else {
      return (
        spec.major === this.major &&
        spec.minor === this.minor &&
        (spec.micro === undefined || spec.micro === (this.micro ?? 0)) &&
        (spec.patch === undefined || spec.patch === (this.patch ?? 0)) &&
        (spec.build === undefined || spec.build === this.build)
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

export function findBuilder(spec?: AgdaVersion): AgdaBuilder | null {
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
  versionStringOrParts?: string | AgdaVersionParts
): AgdaBuilder {
  // Parse the version specification
  let agdaVer: AgdaVersion | undefined
  if (versionStringOrParts !== undefined && versionStringOrParts !== 'latest') {
    agdaVer = new AgdaVersion(versionStringOrParts)
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
