import * as core from '@actions/core'
import assert from 'node:assert'
import * as opts from './opts'
import * as hackage from './util/hackage'
import bundledAgdaPackageInfoCache from './package-info/Agda.versions.json'

export * from './util/agda'
export {default as ensureError} from './util/ensure-error'
export * from './util/exec'
export * from './util/haskell'
export * from './util/homebrew'
export * from './util/pacman'
export * from './util/patch-binary'
export * from './util/patch-permissions'
export * from './util/pkg-config'
export * as simver from './util/simver'

// Agda utilities

const agdaPackageInfoCache =
  bundledAgdaPackageInfoCache as hackage.PackageInfoCache

export async function resolveAgdaVersion(
  options: opts.BuildOptions
): Promise<void> {
  // Ensure that we cache the package info:
  await cacheAgdaPackageInfo(options)

  // Resolve the given version against Hackage's package versions:
  const agdaVersion = await hackage.resolvePackageVersion(
    'Agda',
    options['agda-version'],
    agdaPackageInfoOptions(options)
  )
  if (options['agda-version'] !== agdaVersion) {
    core.info(
      `Resolved Agda version ${options['agda-version']} to ${agdaVersion}`
    )
    options['agda-version'] = agdaVersion
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
  await cacheAgdaPackageInfo(options)

  // Get the package source:
  const {packageVersion, packageDir} = await hackage.getPackageSource('Agda', {
    packageVersion: options['agda-version'],
    ...agdaPackageInfoOptions(options)
  })
  assert(
    options['agda-version'] === packageVersion,
    `getAgdaSource: ${options['agda-version']} was resolved to ${packageVersion}`
  )
  return packageDir
}

function agdaPackageInfoOptions(
  options: opts.BuildOptions
): hackage.PackageInfoOptions {
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

async function cacheAgdaPackageInfo(options: opts.BuildOptions): Promise<void> {
  if (options['package-info-cache'] === undefined) {
    options['package-info-cache'] = await hackage.getPackageInfo('Agda', {
      packageInfoCache: agdaPackageInfoCache
    })
  }
}
