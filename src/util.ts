import * as core from '@actions/core'
import assert from 'node:assert'
import * as path from 'node:path'
import * as opts from './opts'
import * as agda from './util/agda'
import * as hackage from './util/hackage'

export {
  agdaBinName,
  agdaBinNames,
  agdaModeBinName,
  AgdaOptions,
  agdaTest
} from './util/agda'

export * from './util/exec'

export {
  ghc,
  ghcGetVersion,
  cabal,
  cabalGetVersion,
  stack,
  stackGetVersion,
  stackGetLocalBin
} from './util/haskell'

export * from './util/io'

export * as simver from './util/simver'

export function addPkgConfigPath(pkgConfigDir: string): void {
  const pathSep = opts.os === 'windows' ? ';' : ':'
  const pkgConfigPath = process.env.PKG_CONFIG_PATH ?? ''
  const pkgConfigDirs = pkgConfigPath.split(pathSep).filter(dir => dir !== '')
  core.exportVariable(
    'PKG_CONFIG_PATH',
    [pkgConfigDir, ...pkgConfigDirs].join(pathSep)
  )
}

// Agda utilities

export async function resolveAgdaVersion(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
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

export async function getAgdaSource(
  options: opts.BuildOptions
): Promise<string> {
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

export async function setupAgdaEnv(installDir: string): Promise<void> {
  const dataDir = path.join(installDir, 'data')
  core.info(`Set Agda_datadir to ${dataDir}`)
  core.exportVariable('Agda_datadir', dataDir)
  core.setOutput('agda-data-path', dataDir)
  const binDir = path.join(installDir, 'bin')
  core.info(`Add ${binDir} to PATH`)
  core.addPath(binDir)
  core.setOutput('agda-path', binDir)
  core.setOutput('agda-exe', path.join(binDir, agda.agdaBinName))
  core.setOutput('agda-mode-exe', path.join(binDir, agda.agdaModeBinName))
}

// Helpers for caching package info

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
        packageInfoCache: opts.packageInfoCache
      })
    }
  } else {
    return options
  }
}
