import * as core from '@actions/core'
import assert from 'node:assert'
import os from 'node:os'
import pick from 'object.pick'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import * as opts from './opts'
import * as util from './util'
import distHaskellVersionInfo from './package-info/Haskell.json'
import ensureError from 'ensure-error'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  // Filter GHC versions by those supported by haskell/actions/setup:
  try {
    options['ghc-supported-versions'] = supportedGhcVersions(options)
  } catch (error) {
    // If no supported versions are found, try 'stack-setup-ghc':
    if (options['enable-stack']) {
      core.info(ensureError(error).message)
      core.info('Trying with "stack-setup-ghc"')
      options['stack-setup-ghc'] = true
    } else {
      throw error
    }
  }

  // Select GHC version:
  options['ghc-version'] = maxSatisfyingGhcVersion(options)

  // Run haskell/actions/setup:
  await setupHaskell(
    Object.fromEntries(
      Object.entries(pickSetupHaskellInputs(options)).map(e => {
        const [k, v] = e
        if (typeof v === 'boolean') return [k, v ? 'true' : '']
        else return [k, v]
      })
    )
  )
  core.setOutput('haskell-setup', 'true')

  // Update the GHC version:
  options['ghc-version'] = await util.ghcGetVersion(
    pick(options, ['enable-stack', 'stack-no-global'])
  )

  // Update the Cabal version:
  options['cabal-version'] = await util.cabalGetVersion(
    pick(options, ['enable-stack', 'stack-no-global'])
  )

  // Update the Stack version:
  if (options['enable-stack']) {
    options['stack-version'] = await util.stackGetVersion()
  }
}

function maxSatisfyingGhcVersion(options: opts.BuildOptions): string {
  assert(options['ghc-version'] === 'latest')
  let maybeGhcVersion = semver.maxSatisfying(
    options['ghc-supported-versions'],
    options['ghc-version-range']
  )
  if (maybeGhcVersion === null) {
    throw Error(
      `No compatible GHC versions found: ${options['ghc-version-range']}`
    )
  } else {
    // If we should ignore the GHC patch version, do it:
    if (opts.shouldIgnoreGhcPatchVersion(options))
      maybeGhcVersion = util.simver.majorMinor(maybeGhcVersion)
    core.info(`Select GHC ${maybeGhcVersion}`)
    return maybeGhcVersion
  }
}

// Compute the GHC versions supported by BOTH the requested Agda version,
// passed in via options['ghc-supported-versions'], and haskell/actions/setup:
function supportedGhcVersions(options: opts.BuildOptions): string[] {
  // Unless we're setting up GHC via Stack:
  if (options['stack-setup-ghc']) {
    // NOTE: I don't know what versions Stack still supports.
    return options['ghc-supported-versions']
  } else {
    // NOTE: We cannot use a simple Set intersection, as we need to be able to
    //       use ghcVersionMatch, which ignores the patch version:
    const byAgda = options['ghc-supported-versions']
    const bySetupHaskell = distHaskellVersionInfo.ghc
    const byBoth = bySetupHaskell.filter(ghcVersion =>
      byAgda.reduce(
        (foundCompatible: boolean, supportedGhcVersion: string) =>
          foundCompatible ||
          opts.ghcVersionMatch(ghcVersion, supportedGhcVersion, options),
        false
      )
    )
    if (byBoth.length === 0) {
      throw Error(
        [
          `Could not find a GHC version supported by Agda and haskell/actions/setup.`,
          `- Agda ${options['agda-version']} supports: ${byAgda.join(', ')}`,
          `- haskell/actions/setup supports: ${bySetupHaskell.join(', ')}`
        ].join(os.EOL)
      )
    } else {
      return byBoth
    }
  }
}

function pickSetupHaskellInputs(
  options: opts.BuildOptions
): opts.SetupHaskellInputs {
  return pick(options, [
    'cabal-version',
    'disable-matcher',
    'enable-stack',
    'ghc-version',
    'stack-no-global',
    'stack-setup-ghc',
    'stack-version'
  ])
}
