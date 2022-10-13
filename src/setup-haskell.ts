import * as core from '@actions/core'
import * as opts from './opts'
import setupHaskell from 'setup-haskell'
import * as haskell from './util/haskell'

export default async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
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
  const cabalVersion =
    options['enable-stack'] && options['stack-no-global']
      ? await haskell.getStackCabalVersionForGhc(options['ghc-version'])
      : await haskell.getSystemCabalVersion()
  options = {...options, 'cabal-version': cabalVersion}

  // Update the Stack version:
  const stackVersion = options['enable-stack']
    ? await haskell.getSystemStackVersion()
    : ''
  options = {...options, 'stack-version': stackVersion}

  return options
}
