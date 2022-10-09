import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '../../util/io'
import assert from 'assert'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import * as opts from '../../opts'
import * as agda from '../../util/agda'
import * as haskell from '../../util/haskell'

export async function build(
  sourceDir: string,
  installDir: string,
  options: Readonly<opts.SetupOptions>
): Promise<void> {
  const execOptions = {cwd: sourceDir}
  // Configure:
  core.info(`Configure Agda-${options['agda-version']}`)
  await haskell.execSystemCabal(
    ['v2-configure'].concat(buildFlags(options)),
    execOptions
  )
  // Build:
  core.info(`Build Agda-${options['agda-version']}`)
  await haskell.execSystemCabal(
    ['v2-build', 'exe:agda', 'exe:agda-mode'],
    execOptions
  )
  // Install:
  core.info(`Install Agda-${options['agda-version']} to ${installDir}`)
  await io.mkdirP(path.join(installDir, 'bin'))
  await haskell.execSystemCabal(
    [
      'v2-install',
      'exe:agda',
      'exe:agda-mode',
      '--install-method=copy',
      `--installdir=${path.join(installDir, 'bin')}`
    ],
    execOptions
  )
}

export async function findGhcVersionRange(
  sourceDir: string,
  options: Readonly<opts.SetupOptions>
): Promise<string> {
  // Get compatible versions:
  let versions = await findCompatibleGhcVersions(sourceDir)

  // Filter using 'ghc-version-range'
  versions = versions.filter(version =>
    semver.satisfies(version, options['ghc-version-range'])
  )

  // Return version range:
  if (versions.length === null) {
    throw Error(`No compatible GHC versions found`)
  } else {
    const range = versions.join(' || ')
    assert(
      semver.validRange(range) !== null,
      `Invalid GHC version range ${range}`
    )
    return range
  }
}

export async function readPlatformTag(sourceDir: string): Promise<string> {
  // Nix-style local builds were introduced in Cabal version 1.24, and are
  // supported on all compatible GHC versions, i.e., 7.0 and later, see:
  // https://cabal.readthedocs.io/en/3.8/nix-local-build-overview.html
  const planPath = path.join(sourceDir, 'dist-newstyle', 'cache', 'plan.json')
  if (!fs.existsSync(planPath)) {
    throw Error('Run `cabal configure` first.')
  } else {
    const planString = fs.readFileSync(planPath).toString()
    const plan = JSON.parse(planString)
    if (plan?.os !== undefined && plan?.arch !== undefined) {
      return `${plan?.arch}-${plan?.os}`
    } else {
      throw Error([`Could not parse ${planPath}:`, planString].join(os.EOL))
    }
  }
}

function buildFlags(options: Readonly<opts.SetupOptions>): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  flags.push('--disable-executable-profiling')
  flags.push('--disable-library-profiling')
  // Disable --cluster-counting
  if (agda.supportsClusterCounting(options)) {
    flags.push('--flags=-enable-cluster-counting')
  }
  // If supported, build a static executable
  if (haskell.supportsExecutableStatic(options)) {
    flags.push('--enable-executable-static')
  }
  // If supported, set --split-sections.
  if (haskell.supportsSplitSections(options)) {
    flags.push('--enable-split-sections')
  }
  return flags
}

export async function findCompatibleGhcVersions(
  sourceDir: string
): Promise<string[]> {
  const versions: string[] = []
  const cabalFilePath = await findCabalFile(sourceDir)
  const cabalFileContents = fs.readFileSync(cabalFilePath).toString()
  for (const match of cabalFileContents.matchAll(
    /GHC == (?<version>\\d+\\.\\d+\\.\\d+)/g
  )) {
    if (match.groups !== undefined) {
      if (semver.valid(match.groups.version) !== null) {
        versions.push(match.groups.version)
      } else {
        core.warning(
          `Could not parse GHC version '${match.groups.version}' in: ${cabalFilePath}`
        )
      }
    }
  }
  return versions
}

async function findCabalFile(sourceDir: string): Promise<string> {
  const cabalFileGlobber = await glob.create(path.join(sourceDir, '*.cabal'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const cabalFilePaths = await cabalFileGlobber.glob()
  if (cabalFilePaths.length !== 1) {
    throw Error(
      [
        `Found multiple .cabal files:`,
        ...cabalFilePaths.map(cabalFilePath => `- ${cabalFilePath}`)
      ].join(os.EOL)
    )
  } else {
    return cabalFilePaths[0]
  }
}
