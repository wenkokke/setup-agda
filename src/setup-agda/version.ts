import * as core from '@actions/core'
import * as semver from 'semver'
import * as setupHaskell from '../setup-haskell'
import * as os from 'os'

export default async function setupAgdaVersion(
  agdaSemVer: semver.SemVer
): Promise<void> {
  core.debug(`Setup '${agdaSemVer.version}' on ${os.platform()}`)
  const ghcVersion = await setupHaskell.ghcVersion()
  core.info(`Found GHC version ${ghcVersion?.version}`)
}
