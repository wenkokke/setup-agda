import assert from 'node:assert'
import pick from 'object.pick'
import setupHaskell from 'setup-haskell'
import * as opts from './opts'
import * as util from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  assert(options['ghc-version'] !== 'recommended')

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
  util.logging.setOutput('haskell-setup', 'true')

  // Update the GHC version:
  options['ghc-version'] = await util.ghcGetVersion()

  // Update the Cabal version:
  options['cabal-version'] = await util.cabalGetVersion()
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
