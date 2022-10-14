import * as core from '@actions/core'
import * as opts from './opts'
import setupHaskell from 'setup-haskell'
import * as haskell from './util/haskell'

export default async function setup(options: opts.BuildOptions): Promise<void> {
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
      : await haskell.getSystemCabalVersion()

  // Update the Stack version:
  if (options['enable-stack'])
    options['stack-version'] = await haskell.getSystemStackVersion()
}
