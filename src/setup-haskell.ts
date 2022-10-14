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
      Object.entries(opts.pickSetupHaskellInputs(options)).map(e => {
        const [k, v] = e
        if (typeof v === 'boolean') return [k, v ? 'true' : '']
        else return [k, v]
      })
    )
  )
  core.setOutput('haskell-setup', 'true')

  // Update the Cabal version:
  options['cabal-version'] = await util.cabalGetVersion(
    pick(options, ['enable-stack', 'ghc-version', 'stack-no-global'])
  )

  // Update the Stack version:
  if (options['enable-stack'])
    options['stack-version'] = await util.stackGetVersion()
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
