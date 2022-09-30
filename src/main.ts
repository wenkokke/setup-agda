import * as core from '@actions/core'
import {setupHaskell, HaskellOptions} from './haskell'

async function main(): Promise<void> {
  try {
    const agda_version: string = core.getInput('agda-version')
    core.info(agda_version)
    const haskellOptions: HaskellOptions = {}
    haskellOptions.ghc_version = '9.2.4'
    haskellOptions.cabal_version = 'latest'
    setupHaskell(haskellOptions)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
