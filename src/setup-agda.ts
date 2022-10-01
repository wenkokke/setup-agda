import * as core from '@actions/core'
import * as setupHaskell from './setup-haskell'

export default async function setupAgda(agdaVersion: string): Promise<void> {
  try {
    core.info(agdaVersion)
    const ghcVersion = await setupHaskell.ghcVersion()
    core.info(`Found GHC version ${ghcVersion?.version}`)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}
