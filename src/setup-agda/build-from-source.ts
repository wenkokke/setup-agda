import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '../util/io'
import * as tc from '@actions/tool-cache'
import assert from 'assert'
import * as os from 'os'
import * as semver from 'semver'
import * as path from 'path'
import * as opts from '../opts'
import * as exec from '../util/exec'
import * as agda from '../util/agda'
import * as hackage from '../util/hackage'
import * as upx from '../util/upx'
import * as icu from '../util/icu'
import * as haskell from '../util/haskell'
import * as cabal from './build-from-source/cabal'
import * as stack from './build-from-source/stack'
import ensureError from 'ensure-error'

export default async function buildFromSource(
  options: Readonly<opts.SetupOptions>
): Promise<string> {
  // Resolve the Agda version:
  const [setupOptions, packageInfoOptions] = await resolveAgdaVersion(options)
  core.info(`Setting up Agda ${setupOptions['agda-version']}`)

  // Setup Agda:
  const installDirTC = await tryToolCache(setupOptions['agda-version'])
  if (installDirTC !== null) {
    return installDirTC
  } else {
    return await build(setupOptions, packageInfoOptions)
  }
}

async function tryToolCache(agdaVersion: string): Promise<string | null> {
  const installDirTC = tc.find('agda', agdaVersion)
  if (installDirTC === '') {
    return null
  } else {
    try {
      core.info(`Found Agda ${agdaVersion} in cache`)
      const agdaPath = path.join(installDirTC, 'bin', agda.agdaExe)
      const env = {Agda_datadir: path.join(installDirTC, 'data')}
      agda.testSystemAgda({agdaPath, env})
      return installDirTC
    } catch (error) {
      core.warning(ensureError(error))
      return null
    }
  }
}

async function build(
  options: Readonly<opts.SetupOptions>,
  packageInfoOptions?: hackage.PackageInfoOptions
): Promise<string> {
  // Otherwise, build Agda from source:
  core.info(`Building Agda ${options['agda-version']} from source`)
  const buildTool = resolveBuildTool(options)

  // 1. Get the Agda source from Hackage:
  const sourceDir = await getAgdaSource(
    options['agda-version'],
    packageInfoOptions
  )
  core.debug(`Downloaded source to ${sourceDir}`)

  // 2. Select compatible GHC versions:
  const ghcVersions = await buildTool.findCompatibleGhcVersions(sourceDir)
  const ghcVersionRange = await findGhcVersionRange(ghcVersions, options)
  core.debug(`Compatible GHC version range is: ${ghcVersionRange}`)

  // 3. Setup GHC via <haskell/actions/setup>:
  options = await haskell.setup({
    ...options,
    'ghc-version-range': ghcVersionRange
  })

  // 4. Install compatible ICU version:
  options = icu.resolveIcuVersion(options)
  if (options['icu-version'] !== '') {
    const {extraLibDir, extraIncludeDir} = await icu.installICU(
      options['icu-version']
    )
    if (options['extra-lib-dirs'] === '') {
      options = {...options, 'extra-lib-dirs': extraLibDir}
    }
    if (options['extra-include-dirs'] === '') {
      options = {...options, 'extra-include-dirs': extraIncludeDir}
    }
  }

  // 4. Build:
  const installDir = agda.installDir(options['agda-version'])
  await buildTool.build(sourceDir, installDir, options)
  await copyData(path.join(sourceDir, 'src', 'data'), installDir)

  // 5. Test:
  const agdaPath = path.join(installDir, 'bin', agda.agdaExe)
  const env = {Agda_datadir: path.join(installDir, 'data')}
  await agda.testSystemAgda({agdaPath, env})

  // 6. Cache:
  const installDirTC = await tc.cacheDir(
    installDir,
    'agda',
    options['agda-version']
  )

  // 7. If 'upload-bdist' is specified, upload as a binary distribution:
  if (options['upload-bdist'] !== '') {
    const bdistName = await uploadAsArtifact(installDir, options)
    core.info(`Uploaded binary distribution as '${bdistName}'`)
  }

  return installDirTC
}

async function copyData(dataDir: string, dest: string): Promise<void> {
  await io.cp(dataDir, dest, {recursive: true})
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

async function getAgdaSource(
  agdaVersion: string,
  packageInfoOptions?: hackage.PackageInfoOptions
): Promise<string> {
  const {packageVersion, packageDir} = await hackage.getPackageSource('Agda', {
    packageVersion: agdaVersion,
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

interface BuildTool {
  build: (
    sourceDir: string,
    installDir: string,
    options: Readonly<opts.SetupOptions>
  ) => Promise<void>
  findCompatibleGhcVersions: (sourceDir: string) => Promise<string[]>
}

function resolveBuildTool(options: Readonly<opts.SetupOptions>): BuildTool {
  if (options['enable-stack']) {
    return stack
  } else {
    return cabal
  }
}

async function findGhcVersionRange(
  versions: string[],
  options: Readonly<opts.SetupOptions>
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

async function uploadAsArtifact(
  installDir: string,
  options: Readonly<opts.SetupOptions>
): Promise<string> {
  // If not specified, get the target platform from `ghc --info`:
  if (options['upload-bdist-target-platform'] === '') {
    options = {
      ...options,
      'upload-bdist-target-platform': await haskell.getGhcTargetPlatform()
    }
  }

  // Get the name for the distribution
  const bdistName = `agda-${options['agda-version']}-${options['upload-bdist-target-platform']}`
  const bdistDir = path.join(agda.agdaDir(), 'bdist', bdistName)
  io.mkdirP(bdistDir)

  // Copy binaries
  io.mkdirP(path.join(bdistDir, 'bin'))
  const bins = [agda.agdaExe, agda.agdaModeExe].map(binName =>
    path.join(installDir, 'bin', binName)
  )
  if (options['upload-bdist-compress-bin'] !== '') {
    await compressBins(bins, path.join(bdistDir, 'bin'))
  } else {
    await copyBins(bins, path.join(bdistDir, 'bin'))
  }

  // Copy data
  await copyData(path.join(installDir, 'data'), bdistDir)

  // Gather info for artifact:
  const globber = await glob.create(path.join(bdistDir, '**', '*'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const files = await globber.glob()

  // Upload artifact:
  const artifactClient = artifact.create()
  const uploadInfo = await artifactClient.uploadArtifact(
    bdistName,
    files,
    bdistDir,
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

async function copyBins(bins: string[], dest: string): Promise<void> {
  for (const binPath of bins) {
    const binName = path.basename(binPath)
    await io.cp(binPath, path.join(dest, binName))
  }
}

async function compressBins(bins: string[], dest: string): Promise<void> {
  const upxPath = await upx.installUPX('3.96')
  for (const binPath of bins) {
    const binName = path.basename(binPath)
    await exec.exec(upxPath, [
      '--best',
      binPath,
      '-o',
      path.join(dest, binName)
    ])
  }
}
