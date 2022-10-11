import * as core from '@actions/core'
import * as opts from './opts'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import assert from 'assert'
import ensureError from 'ensure-error'
import * as haskell from './util/haskell'

export default async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Try the pre-installed software:
  const preInstalled = await tryPreInstalled(options)
  if (preInstalled !== null) return preInstalled

  // Otherwise, use haskell/actions/setup:
  // 1. Find the latest compatible version from 'ghc-version-range':
  const ghcVersion = latestSatisfyingGhcVersion(options)
  options = {...options, 'ghc-version': ghcVersion}

  // 2. Run haskell/actions/setup:
  await setupHaskell(
    Object.fromEntries(
      Object.entries(opts.pickSetupHaskellInputs(options)).map(e => {
        const [k, v] = e
        if (typeof v === 'boolean') return [k, v ? 'true' : '']
        else return [k, v]
      })
    )
  )
  core.setOutput('haskell-setup', 'true')

  // 3. Update the Cabal version:
  if (options['enable-stack'] && options['stack-no-global']) {
    options = {
      ...options,
      'cabal-version': await haskell.getStackCabalVersionForGhc(ghcVersion)
    }
  } else {
    options = {
      ...options,
      'cabal-version': await haskell.getSystemCabalVersion()
    }
  }
  // 3. Update the Stack version:
  if (options['enable-stack']) {
    options = {
      ...options,
      'stack-version': await haskell.getSystemStackVersion()
    }
  }
  return options
}

async function tryPreInstalled(
  options: opts.BuildOptions
): Promise<opts.BuildOptions | null> {
  // If we need Stack, we cannot use the pre-installed tools:
  if (options['enable-stack']) return null
  try {
    // Get pre-installed GHC & Cabal versions:
    const ghcVersion = await haskell.getSystemGhcVersion()
    core.info(`Found pre-installed GHC version ${ghcVersion}`)
    const cabalVersion = await haskell.getSystemCabalVersion()
    core.info(`Found pre-installed Cabal version ${cabalVersion}`)

    // Check if the GHC version is compatible with the Agda version:
    if (semver.satisfies(ghcVersion, options['ghc-version-range'])) {
      return {
        ...options,
        'ghc-version': ghcVersion,
        'cabal-version': cabalVersion
      }
    } else {
      core.info(
        `Pre-installed GHC is incompatible with ${options['agda-version']}`
      )
      return null
    }
  } catch (error) {
    core.debug(
      `Could not find pre-installed GHC and Cabal: ${
        ensureError(error).message
      }`
    )
    return null
  }
}

function latestSatisfyingGhcVersion(options: opts.BuildOptions): string {
  const ghcVersions = options['ghc-version-range']
    .split('||')
    .map(version => version.trim())
  assert(
    ghcVersions.every(version => semver.valid(version)),
    [
      `Input 'ghc-version-range' should be resolved to list of concrete versions separated by '||'`,
      `found '${options['ghc-version-range']}'`
    ].join(', ')
  )
  const ghcVersion = semver.maxSatisfying(ghcVersions, '*')
  if (ghcVersion === null) {
    throw Error(
      `No compatible GHC versions found: ${options['ghc-version-range']}`
    )
  } else {
    return ghcVersion
  }
}
