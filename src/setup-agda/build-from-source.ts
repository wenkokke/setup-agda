import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import assert from 'assert'
import ensureError from 'ensure-error'
import * as path from 'path'
import * as semver from 'semver'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import setupIcu from '../setup-icu'
import * as io from '../util/io'
import * as agda from '../util/agda'
import * as hackage from '../util/hackage'
import * as cabal from './build-from-source/cabal'
import * as stack from './build-from-source/stack'
import uploadBdist from './build-from-source/bdist'

export default async function buildFromSource(
  options: opts.BuildOptions
): Promise<string> {
  // Resolve the Agda version:
  options = await resolveAgdaVersion(options)
  core.info(`Setting up Agda ${options['agda-version']}`)

  // Setup Agda:
  const installDirTC = await tryToolCache(options['agda-version'])
  if (installDirTC !== null) {
    return installDirTC
  } else {
    return await build(options)
  }
}

async function tryToolCache(agdaVersion: string): Promise<string | null> {
  const installDirTC = tc.find('agda', agdaVersion)
  if (installDirTC === '') {
    return null
  } else {
    try {
      core.info(`Found Agda ${agdaVersion} in cache`)
      const agdaPath = path.join(installDirTC, 'bin', agda.agdaBinName)
      const env = {Agda_datadir: path.join(installDirTC, 'data')}
      agda.testSystemAgda({agdaPath, env})
      return installDirTC
    } catch (error) {
      core.warning(ensureError(error))
      return null
    }
  }
}

async function build(options: opts.BuildOptions): Promise<string> {
  // Otherwise, build Agda from source:
  core.info(`Building Agda ${options['agda-version']} from source`)
  const buildTool = resolveBuildTool(options)

  // 1. Get the Agda source from Hackage:
  const sourceDir = await getAgdaSource(options)
  core.debug(`Downloaded source to ${sourceDir}`)

  // 2. Select compatible GHC versions:
  const ghcVersions = await buildTool.getGhcVersionCandidates(sourceDir)
  const ghcVersionRange = await findGhcVersionRange(ghcVersions, options)
  core.debug(`Compatible GHC version range is: ${ghcVersionRange}`)

  // 3. Setup GHC via <haskell/actions/setup>:
  options = await setupHaskell({
    ...options,
    'ghc-version-range': ghcVersionRange
  })

  // 4. Install ICU:
  if (opts.supportsClusterCounting(options)) {
    options = await setupIcu(options)
  }

  // 5. Build:
  const installDir = agda.installDir(options['agda-version'])
  await buildTool.build(sourceDir, installDir, options)
  await io.cpR(path.join(sourceDir, 'src', 'data'), installDir)

  // 6. Test:
  const agdaPath = path.join(installDir, 'bin', agda.agdaBinName)
  const env = {Agda_datadir: path.join(installDir, 'data')}
  await agda.testSystemAgda({agdaPath, env})

  // 7. Cache:
  const installDirTC = await tc.cacheDir(
    installDir,
    'agda',
    options['agda-version']
  )

  // 8. If 'upload-bdist' is specified, upload as a binary distribution:
  if (options['upload-bdist']) {
    const bdistName = await uploadBdist(installDir, options)
    core.info(`Uploaded binary distribution as '${bdistName}'`)
  }
  return installDirTC
}

async function resolveAgdaVersion(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Nightly builds should be handled by 'download-nightly'
  assert(
    options['agda-version'] !== 'nightly',
    `resolveAgdaVersion: agdaVersion should not be nightly`
  )

  // Ensure that we cache the package info:
  options = await cachePackageInfo(options)

  // Resolve the given version against Hackage's package versions:
  const agdaVersion = await hackage.resolvePackageVersion(
    'Agda',
    options['agda-version'],
    packageInfoOptions(options)
  )
  if (options['agda-version'] !== agdaVersion) {
    core.info(
      `Resolved Agda version ${options['agda-version']} to ${agdaVersion}`
    )
    return {...options, 'agda-version': agdaVersion}
  } else {
    return options
  }
}

async function getAgdaSource(options: opts.BuildOptions): Promise<string> {
  // Version number should be resolved by now:
  assert(
    options['agda-version'] !== 'latest' &&
      options['agda-version'] !== 'nightly',
    `getAgdaSource: agdaVersion should be resolved`
  )

  // Ensure that we cache the package info:
  options = await cachePackageInfo(options)

  // Get the package source:
  const {packageVersion, packageDir} = await hackage.getPackageSource('Agda', {
    packageVersion: options['agda-version'],
    ...packageInfoOptions(options)
  })
  assert(
    options['agda-version'] === packageVersion,
    `getAgdaSource: ${options['agda-version']} was resolved to ${packageVersion}`
  )
  return packageDir
}

interface BuildTool {
  build: (
    sourceDir: string,
    installDir: string,
    options: opts.BuildOptions
  ) => Promise<void>
  getGhcVersionCandidates: (sourceDir: string) => Promise<string[]>
}

function resolveBuildTool(options: opts.BuildOptions): BuildTool {
  if (options['enable-stack']) {
    return stack
  } else {
    return cabal
  }
}

async function findGhcVersionRange(
  versions: string[],
  options: opts.BuildOptions
): Promise<string> {
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

// Helpers for package info caching

function packageInfoOptions(
  options: opts.BuildOptions
): opts.PackageInfoOptions {
  if (options['package-info-cache'] !== undefined) {
    return {
      fetchPackageInfo: false,
      packageInfoCache: options['package-info-cache']
    }
  } else {
    return {
      fetchPackageInfo: true
    }
  }
}

async function cachePackageInfo(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  if (options['package-info-cache'] === undefined) {
    return {
      ...options,
      'package-info-cache': await hackage.getPackageInfo('Agda', {
        packageInfoCache: agda.packageInfoCache
      })
    }
  } else {
    return options
  }
}
