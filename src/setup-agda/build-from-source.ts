import * as core from '@actions/core'
import * as path from 'path'
import * as semver from 'semver'
import * as haskell from '../util/haskell'
import * as agda from '../util/agda'
import * as simver from '../util/simver'
import * as opts from '../opts'
import assert from 'assert'
import {SetupOptions} from '../opts'

export interface VersionInfo {
  readonly 'agda-version': string
  readonly 'ghc-version': string
  readonly 'cabal-version': string
}

function supportsClusterCounting(versionInfo: VersionInfo): boolean {
  // NOTE:
  //   We only disable --cluster-counting on versions which support it,
  //   i.e., versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  return simver.gte(versionInfo['agda-version'], '2.5.3')
}

function supportsExecutableStatic(versionInfo: VersionInfo): boolean {
  // NOTE:
  //  We only set --enable-executable-static on Linux, because the deploy workflow does it.
  //  https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-executable-static
  const osOK = opts.platform === 'linux'
  // NOTE:
  //  We only set --enable-executable-static if GHC >=8.4, when the flag was added:
  //  https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-static
  const ghcVersionOK = simver.gte(versionInfo['ghc-version'], '8.4')
  return osOK && ghcVersionOK
}

function supportsSplitSections(versionInfo: VersionInfo): boolean {
  // NOTE:
  //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
  //   https://github.com/agda/agda/issues/5940
  const osOK = opts.platform === 'linux' || opts.platform === 'win32'
  // NOTE:
  //   We only set --split-sections if GHC >=8.0 and Cabal >=2.2, when the flag was added:
  //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
  const ghcVersionOK = simver.gte(versionInfo['ghc-version'], '8.0')
  const cabalVersionOK = simver.gte(versionInfo['cabal-version'], '2.2')
  return osOK && ghcVersionOK && cabalVersionOK
}

function buildFlags(versionInfo: VersionInfo): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  flags.push('--disable-executable-profiling')
  flags.push('--disable-library-profiling')
  // Disable --cluster-counting
  if (supportsClusterCounting(versionInfo)) {
    flags.push('--flags=-enable-cluster-counting')
  }
  // If supported, build a static executable
  if (supportsExecutableStatic(versionInfo)) {
    flags.push('--enable-executable-static')
  }
  // If supported, set --split-sections.
  if (supportsSplitSections(versionInfo)) {
    flags.push('--enable-split-sections')
  }
  return flags
}

function parseGHCVersionRange(options: SetupOptions): semver.Range {
  // Parse the 'ghc-version' input as a semantic version range:
  const ghcVersionRange =
    options?.['ghc-version'] === undefined ||
    options?.['ghc-version'] === 'latest'
      ? '*'
      : options?.['ghc-version']
  if (semver.validRange(ghcVersionRange) === null) {
    throw Error(
      `ghc-version is set to an unsupported version range '${options?.['ghc-version']}'`
    )
  } else {
    return new semver.Range(ghcVersionRange, {loose: true})
  }
}

export default async function buildAgda(
  options: Readonly<opts.SetupOptions>
): Promise<void> {
  assert(
    options['agda-version'] !== 'nightly',
    `buildAgda: agdaVersion should not be nightly`
  )

  // Get the Agda source from Hackage:
  const {packageVersion, packageDir} = await agda.getPackageSource({
    extractToPath: opts.cacheDir
  })
  core.info(`Retrieved source for Agda-${packageVersion} from Hackage`)

  // Select compatible GHC versions:
  const latestCompatibleGHCVersion = haskell.getLatestCompatibleGHCVersion(
    path.join(packageDir, 'Agda.cabal'),
    parseGHCVersionRange(options)
  )
  core.info(`Selected GHC version ${latestCompatibleGHCVersion}`)

  // Setup GHC via <haskell/actions/setup>:
  await haskell.setup(
    Object.assign({}, options, {'ghc-version': latestCompatibleGHCVersion})
  )

  // Gather version info:
  const versionInfo = {
    'agda-version': packageVersion,
    'ghc-version': await haskell.getSystemGHCVersion(),
    'cabal-version': await haskell.getSystemCabalVersion()
  }

  // Cabal configure:
  await haskell.execSystemCabal(['configure'].concat(buildFlags(versionInfo)), {
    cwd: packageDir
  })
}
