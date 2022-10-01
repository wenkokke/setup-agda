import * as core from '@actions/core'
import {setupHaskell} from './setup-haskell'

async function main(): Promise<void> {
  try {
    const agda_version: string = core.getInput('agda-version')
    core.info(agda_version)
    setupHaskell({})
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
