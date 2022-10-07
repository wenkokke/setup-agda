import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as tc from '@actions/tool-cache'
import assert from 'assert'
import * as os from 'os'
import * as path from 'path'
import * as semver from 'semver'
import * as opts from '../opts'
import {SetupOptions} from '../opts'
import * as agda from '../util/agda'
import * as hackage from '../util/hackage'
import * as haskell from '../util/haskell'
import * as simver from '../util/simver'

export default async function buildFromSource(
  options: Readonly<opts.SetupOptions>
): Promise<string> {
  // Resolve the Agda version & check the tool cache:
  const [setupOptions, packageInfoOptions] = await resolveAgdaVersion(options)
  core.info(`Setting up Agda ${setupOptions['agda-version']}`)
  // Setup Agda:
  let installDir: string | null = null
  // 1. Try tool cache:
  installDir = await findCachedAgda(setupOptions['agda-version'])
  if (installDir !== null) installDir
  // 2. Build from source:
  installDir = await buildAgda(setupOptions, packageInfoOptions)
  return installDir
}

async function findCachedAgda(agdaVersion: string): Promise<string | null> {
  const installDirTC = tc.find('agda', agdaVersion)
  if (installDirTC === '') {
    return null
  } else {
    try {
      core.info(`Found Agda ${agdaVersion} in cache`)
      agda.testSystemAgda({
        systemAgda: path.join(installDirTC, 'bin', 'agda'),
        systemAgdaDataDir: path.join(installDirTC, 'data')
      })
      return installDirTC
    } catch (error) {
      if (error instanceof Error) {
        core.warning(error)
      } else {
        let message = `${error}`
        if (message.startsWith('Error: ')) {
          message = message.substring('Error: '.length)
        }
        core.warning(message)
      }
      return null
    }
  }
}

async function buildAgda(
  options: Readonly<opts.SetupOptions>,
  packageInfoOptions?: hackage.PackageInfoOptions
): Promise<string> {
  // Otherwise, build Agda from source:
  core.info(`Building Agda ${options['agda-version']} from source`)

  // 1. Get the Agda source from Hackage:
  const sourceDir = await getAgdaSource(
    options['agda-version'],
    packageInfoOptions
  )
  core.debug(`Downloaded source to ${sourceDir}`)

  // 2. Select compatible Ghc versions:
  const ghcVersion = haskell.getLatestCompatibleGhcVersion(
    path.join(sourceDir, 'Agda.cabal'),
    resolveGhcVersionRange(options)
  )
  core.debug(`Selected Ghc version ${ghcVersion}`)

  // 3. Setup Ghc via <haskell/actions/setup>:
  await haskell.setup({...options, 'ghc-version': ghcVersion})

  // 4. Configure the build:
  core.info(`Configure Agda-${options['agda-version']}`)
  const flags = buildFlags({
    'agda-version': options['agda-version'],
    'ghc-version': await haskell.getSystemGhcVersion(),
    'cabal-version': await haskell.getSystemCabalVersion()
  })
  await haskell.execSystemCabal(['configure'].concat(flags), {
    cwd: sourceDir
  })

  // 5. Build:
  core.info(`Build Agda-${options['agda-version']}`)
  await haskell.execSystemCabal(['build', 'exe:agda', 'exe:agda-mode'], {
    cwd: sourceDir
  })

  // 6. Install binaries to installDir/bin:
  const installDir = opts.installDir(options['agda-version'])
  const binDir = path.join(installDir, 'bin')
  core.info(`Install Agda-${options['agda-version']} binaries to ${binDir}`)
  await io.mkdirP(binDir)
  await haskell.execSystemCabal(
    [
      'install',
      'exe:agda',
      'exe:agda-mode',
      '--install-method=copy',
      `--installdir=${binDir}`
    ],
    {
      cwd: sourceDir
    }
  )

  // 7. Install data to installDir/data:
  const dataDir = path.join(installDir, 'data')
  core.info(`Install Agda-${options['agda-version']} data to ${dataDir}`)
  await io.cp(path.join(sourceDir, 'src', 'data'), installDir, {
    recursive: true
  })

  // 8. Test the installation:
  await agda.testSystemAgda({
    systemAgda: path.join(binDir, 'agda'),
    systemAgdaDataDir: dataDir
  })

  // 10. Cache the installation:
  const installDirTC = await tc.cacheDir(
    installDir,
    'agda',
    options['agda-version']
  )

  // 11. Upload as artifact:
  const artifactName = await uploadAsArtifact(installDir)
  core.info(`Uploaded build artiface '${artifactName}'`)

  return installDirTC
}

async function resolveAgdaVersion(
  options: Readonly<opts.SetupOptions>
): Promise<
  [Readonly<opts.SetupOptions>, Readonly<hackage.PackageInfoOptions>]
> {
  // Nightly builds should be handled by 'download-nightly'
  assert(
    options['agda-version'] !== 'nightly',
    `resolveAgdaVersion: agdaVersion should not be nightly`
  )
  // Save and return the packageInfo so we only query Hackage once,
  // and reuse the cache if we need the source distribution:
  const packageInfoCache = await hackage.getPackageInfo('Agda', {
    packageInfoCache: agda.packageInfoCache
  })
  const packageInfoOptions = {fetchPackageInfo: false, packageInfoCache}
  // Resolve the given version against Hackage's package versions:
  const agdaVersion = await hackage.resolvePackageVersion(
    'Agda',
    options['agda-version'],
    packageInfoOptions
  )
  if (options['agda-version'] !== agdaVersion) {
    core.info(
      `Resolved Agda version ${options['agda-version']} to ${agdaVersion}`
    )
    options = {...options, 'agda-version': agdaVersion}
  }
  return [options, packageInfoOptions]
}

function resolveGhcVersionRange(options: SetupOptions): semver.Range {
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

async function getAgdaSource(
  agdaVersion: string,
  packageInfoOptions?: hackage.PackageInfoOptions
): Promise<string> {
  const {packageVersion, packageDir} = await hackage.getPackageSource('Agda', {
    packageVersion: agdaVersion,
    extractToPath: opts.cacheDir,
    ...packageInfoOptions
  })
  assert(
    agdaVersion === packageVersion,
    [
      `getAgdaSource: agdaVersion should be resolved`,
      `but ${agdaVersion} was further resolved to ${packageVersion}`
    ].join(', ')
  )
  return packageDir
}

export interface VersionInfo {
  readonly 'agda-version': string
  readonly 'ghc-version': string
  readonly 'cabal-version': string
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
  const osOK = false // opts.os === 'linux' // Unsupported on Ubuntu 20.04
  // NOTE:
  //  We only set --enable-executable-static if Ghc >=8.4, when the flag was added:
  //  https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-static
  const ghcVersionOK = simver.gte(versionInfo['ghc-version'], '8.4')
  return osOK && ghcVersionOK
}

function supportsSplitSections(versionInfo: VersionInfo): boolean {
  // NOTE:
  //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
  //   https://github.com/agda/agda/issues/5940
  const osOK = opts.os === 'linux' || opts.os === 'windows'
  // NOTE:
  //   We only set --split-sections if Ghc >=8.0 and Cabal >=2.2, when the flag was added:
  //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
  const ghcVersionOK = simver.gte(versionInfo['ghc-version'], '8.0')
  const cabalVersionOK = simver.gte(versionInfo['cabal-version'], '2.2')
  return osOK && ghcVersionOK && cabalVersionOK
}

async function uploadAsArtifact(installDir: string): Promise<string> {
  // Gather info for artifact:
  const version = await agda.getSystemAgdaVersion({
    systemAgda: path.join(installDir, 'bin', 'agda'),
    systemAgdaDataDir: path.join(installDir, 'data')
  })
  const name = `Agda-${version}-${opts.os}-${process.arch}`
  const globber = await glob.create(path.join(installDir, '**', '*'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const files = await globber.glob()

  // Upload artifact:
  const artifactClient = artifact.create()
  const uploadInfo = await artifactClient.uploadArtifact(
    name,
    files,
    installDir,
    {
      continueOnError: true,
      retentionDays: 90
    }
  )

  // Report any errors:
  if (uploadInfo.failedItems.length > 0) {
    core.error(['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL))
  }

  // Return artifact name
  return uploadInfo.artifactName
}
