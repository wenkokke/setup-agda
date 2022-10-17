import * as core from '@actions/core'
import assert from 'node:assert'
import pick from 'object.pick'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import * as opts from './opts'
import * as util from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
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
  if (options['enable-stack'])
    options['stack-version'] = await util.stackGetVersion()
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
