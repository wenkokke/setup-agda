import * as core from '@actions/core'
import * as opts from './opts'
import setupHaskell from 'setup-haskell'
import * as haskell from './util/haskell'
import assert from 'node:assert'
import * as semver from 'semver'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  // Select GHC version:
  options['ghc-version'] = maxSatisfyingGhcVersion(options)

  // Run haskell/actions/setup:
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

  // Update the Cabal version:
  options['cabal-version'] =
    options['enable-stack'] && options['stack-no-global']
      ? await haskell.getStackCabalVersionForGhc(options['ghc-version'])
      : await haskell.cabalGetVersion()

  // Update the Stack version:
  if (options['enable-stack'])
    options['stack-version'] = await haskell.getSystemStackVersion()
}

function maxSatisfyingGhcVersion(options: opts.BuildOptions): string {
  assert(options['ghc-version'] === 'latest')
  const maybeGhcVersion = semver.maxSatisfying(
    options['ghc-supported-versions'],
    options['ghc-version-range']
  )
  if (maybeGhcVersion === null) {
    throw Error(
      `No compatible GHC versions found: ${options['ghc-version-range']}`
    )
  } else {
    core.info(`Select GHC ${maybeGhcVersion}`)
    return maybeGhcVersion
  }
}
