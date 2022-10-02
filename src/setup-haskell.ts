import * as core from '@actions/core'
import {exec, ExecOptions} from '@actions/exec'
import * as semver from 'semver'
import haskellActionsSetup from 'setup-haskell'

/**
 * Interface for actions/haskell/setup
 */
export interface HaskellOptions {
  /** Version of GHC to use. If set to "latest", it will always get the latest stable version. If set to "head", it will always get the latest build of GHC. */
  ghc_version?: string

  /** Version of Cabal to use. If set to "latest", it will always get the latest stable version. */
  cabal_version?: string

  /** Version of Stack to use. If set to "latest", it will always get the latest stable version. */
  stack_version?: string

  /** If specified, will setup Stack */
  enable_stack?: boolean

  /** If specified, enable_stack must be set. Prevents installing GHC and Cabal globally */
  stack_no_global?: boolean

  /** If specified, enable_stack must be set. Will run stack setup to install the specified GHC */
  stack_setup_ghc?: boolean

  /** If specified, disables match messages from GHC as GitHub CI annotations */
  disable_matcher?: boolean
}

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
        `Could not find GHC versio, but caught error is not instance of Error: ${error}`
      )
    }
    return null
  }
}

function haskellOptions(options?: HaskellOptions): Record<string, string> {
  const inputs: Record<string, string> = {}
  if (options?.ghc_version !== undefined) {
    inputs['ghc_version'] = options?.ghc_version
  }
  if (options?.cabal_version !== undefined) {
    inputs['cabal_version'] = options?.cabal_version
  }
  if (options?.stack_version !== undefined) {
    inputs['stack_version'] = options?.stack_version
  }
  if (options?.enable_stack === true) {
    inputs['enable_stack'] = '1'
  }
  if (options?.stack_no_global === true) {
    inputs['stack_no_global'] = '1'
  }
  if (options?.stack_setup_ghc === true) {
    inputs['stack_setup_ghc'] = '1'
  }
  if (options?.disable_matcher === true) {
    inputs['disable_matcher'] = '1'
  }
  return inputs
}

export async function setupHaskell(options?: HaskellOptions): Promise<void> {
  await haskellActionsSetup(haskellOptions(options))
}
