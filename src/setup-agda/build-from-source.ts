import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '../util/io'
import * as tc from '@actions/tool-cache'
import assert from 'assert'
import * as fs from 'fs'
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
  options = await haskell.setup({
    ...options,
    'ghc-version-range': ghcVersionRange
  })

  // 4. Install compatible ICU version:
  options = await icu.setup(options)

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
  if (options['upload-bdist']) {
    const bdistName = await uploadAsArtifact(installDir, options)
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

async function uploadAsArtifact(
  installDir: string,
  options: opts.BuildOptions
): Promise<string> {
  // Get the name for the distribution
  const bdistName = await renderBDistName(options)
  const bdistDir = path.join(agda.agdaDir(), 'bdist', bdistName)
  io.mkdirP(bdistDir)

  // Copy executables
  const installedBins = agda.exes.map(exe => path.join(installDir, 'bin', exe))
  const bdistBinDir = path.join(bdistDir, 'bin')
  io.mkdirP(bdistBinDir)
  if (options['bdist-compress-bin']) {
    await compressBins(installedBins, bdistBinDir)
  } else {
    await copyBins(installedBins, bdistBinDir)
  }

  // Copy libraries
  bundleLibs(bdistDir, options)

  // Copy data
  await copyData(path.join(installDir, 'data'), bdistDir)

  // Test artifact
  const agdaPath = path.join(bdistDir, 'bin', agda.agdaExe)
  const env = {Agda_datadir: path.join(bdistDir, 'data')}
  await agda.testSystemAgda({agdaPath, env})

  // Create file list for artifact:
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

// Utilities for copying files

async function renderBDistName(options: opts.BuildOptions): Promise<string> {
  if (options['bdist-name'] === '') {
    const targetPlatform = await haskell.getGhcTargetPlatform()
    return `agda-${options['agda-version']}-${targetPlatform}`
  } else {
    return options['bdist-name']
      .replace('{{agda-version}}', options['agda-version'])
      .replace('{{ghc-version}}', options['agda-version'])
      .replace('{{cabal-version}}', options['cabal-version'])
      .replace('{{stack-version}}', options['stack-version'])
      .replace(
        '{{bdist-compress-bin}}',
        options['bdist-compress-bin'] ? 'compressed' : 'normal'
      )
      .replace('{{os}}', opts.os)
      .replace('{{arch}}', process.arch)
  }
}

async function copyData(dataDir: string, dest: string): Promise<void> {
  await io.cp(dataDir, dest, {recursive: true})
}

async function bundleLibs(
  bdistDir: string,
  options: opts.BuildOptions
): Promise<void> {
  const bdistBinDir = path.join(bdistDir, 'bin')
  // On Windows, we simply copy all DLLs:
  if (opts.os === 'windows') {
    const globber = await glob.create(
      options['extra-lib-dirs']
        .map(libDir => path.join(libDir, '*.dll'))
        .join(os.EOL)
    )
    for await (const bundleLibPath of globber.globGenerator()) {
      io.cp(bundleLibPath, bdistBinDir)
    }
  } else {
    // Create library directory:
    const bdistLibDir = path.join(bdistDir, 'lib')
    await io.mkdirP(bdistLibDir)
    // For each binary, for each of its needed libraries:
    for (const binPath of agda.exes.map(exe => path.join(bdistBinDir, exe))) {
      let bundledLib = false
      for (const libPath of await findNeededLibs(binPath)) {
        // Find if the library is on the extra-lib-path:
        const extraLibPath = await findExtraLib(libPath, options)
        // If so, bundle the library:
        if (extraLibPath !== null) {
          // Copy the library, unless it already exists:
          const bdistLibPath = path.join(
            bdistLibDir,
            path.basename(extraLibPath)
          )
          if (!fs.existsSync(bdistLibPath))
            await io.cp(extraLibPath, bdistLibDir)
          // Update the run path:
          await changeRunPath(
            binPath,
            extraLibPath,
            path.relative(bdistBinDir, bdistLibPath)
          )
          bundledLib = true
        }
      }
      // Add a relative run path:
      if (bundledLib)
        addRunPath(binPath, path.relative(bdistBinDir, bdistLibDir))
    }
  }
}

async function addRunPath(bin: string, loadPath: string): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      if (!path.isAbsolute(loadPath)) loadPath = `$ORIGIN/${loadPath}`
      await exec.execOutput('patchelf', ['-add-rpath', loadPath, bin])
      return
    }
    case 'macos': {
      if (!path.isAbsolute(loadPath)) loadPath = `@executable_path/${loadPath}`
      await exec.execOutput('install_name_tool', ['-add_rpath', loadPath, bin])
      return
    }
    case 'windows':
      return
  }
}

async function findNeededLibs(bin: string): Promise<string[]> {
  switch (opts.os) {
    case 'linux': {
      const output = await exec.execOutput('patchelf', ['--print-needed', bin])
      return output.split(os.EOL).filter(libPath => libPath !== '')
    }
    case 'macos': {
      const output = await exec.execOutput('otool', ['-L', bin])
      return [...output.matchAll(/[A-Za-z0-9./]+\.dylib/g)].map(m => m[0])
    }
  }
  return []
}

async function findExtraLib(
  libPath: string,
  options: opts.BuildOptions
): Promise<string | null> {
  const libName = path.basename(libPath)
  for (const libDir of options['extra-lib-dirs']) {
    const globber = await glob.create(path.join(libDir, libName), {
      followSymbolicLinks: true,
      implicitDescendants: false,
      matchDirectories: false,
      omitBrokenSymbolicLinks: true
    })
    const [match, ...rest] = await globber.glob()
    assert(rest.length === 0, `Found multiple candidates for ${libName}`)
    if (match !== undefined) {
      assert(
        libPath === libName || libPath === match,
        `Library with relative run path: ${libPath}`
      )
      return match
    }
  }
  return null
}

async function changeRunPath(
  bin: string,
  libFrom: string,
  libTo: string
): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      return
    }
    case 'macos': {
      await exec.execOutput('install_name_tool', [
        '-change',
        libFrom,
        `@rpath/${libTo}`,
        bin
      ])
      return
    }
    case 'windows':
      return
  }
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
