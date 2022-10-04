import * as core from '@actions/core'
import {exec, ExecOptions} from '@actions/exec'
import * as semver from 'semver'
import haskellActionsSetup from 'setup-haskell'

export async function ghcVersion(): Promise<semver.SemVer | null> {
  try {
    // run `ghc --numeric-version`
    let execOutput = ''
    const execOptions: ExecOptions = {}
    execOptions.failOnStdErr = true
    execOptions.silent = true
    execOptions.listeners = {
      stdout: (data: Buffer) => {
        execOutput += data.toString()
      }
    }
    await exec('ghc', ['--numeric-version'], execOptions)
    // parse the output as a semantic version
    const ghcSemVer = semver.parse(execOutput.trim())
    if (ghcSemVer !== null) {
      return ghcSemVer
    } else {
      core.warning(`Could not parse GHC version: ${execOutput}`)
      return null
    }
  } catch (error) {
    if (error instanceof Error) {
      core.debug(`Could not find GHC version: ${error.message}`)
    } else {
      // This case should not happen, as the error should always be an instance of Error:
      core.warning(
        `Could not find GHC version, but caught error is not instance of Error: ${error}`
      )
    }
    return null
  }
}

export async function setupHaskell(
  inputs: Record<string, string>
): Promise<void> {
  await haskellActionsSetup(inputs)
}
