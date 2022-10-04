import * as core from '@actions/core'
import {exec, ExecOptions} from '@actions/exec'
import * as semver from 'semver'
import haskellActionsSetup from 'setup-haskell'

/**
 * Interface for actions/haskell/setup
 */
export interface HaskellOptions {
  /** Version of GHC to use. If set to "latest", it will always get the latest stable version. If set to "head", it will always get the latest build of GHC. */
  'ghc-version'?: string

  /** Version of Cabal to use. If set to "latest", it will always get the latest stable version. */
  'cabal-version'?: string

  /** Version of Stack to use. If set to "latest", it will always get the latest stable version. */
  'stack-version'?: string

  /** If specified, will setup Stack */
  'enable-stack'?: boolean

  /** If specified, enable_stack must be set. Prevents installing GHC and Cabal globally */
  'stack-no-global'?: boolean

  /** If specified, enable_stack must be set. Will run stack setup to install the specified GHC */
  'stack-setup-ghc'?: boolean

  /** If specified, disables match messages from GHC as GitHub CI annotations */
  'disable-matcher'?: boolean
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
  if (options?.['ghc-version'] !== undefined) {
    inputs['ghc-version'] = options?.['ghc-version'] ?? 'latest'
  }
  if (options?.['cabal-version'] !== undefined) {
    inputs['cabal-version'] = options?.['cabal-version'] ?? 'latest'
  }
  if (options?.['stack-version'] !== undefined) {
    inputs['stack-version'] = options?.['stack-version'] ?? 'latest'
  }
  if (options?.['enable-stack'] === true) {
    inputs['enable-stack'] = ''
  }
  if (options?.['stack-no-global'] === true) {
    inputs['stack-no-global'] = ''
  }
  if (options?.['stack-setup-ghc'] === true) {
    inputs['stack-setup-ghc'] = ''
  }
  if (options?.['disable-matcher'] === true) {
    inputs['disable-matcher'] = ''
  }
  return inputs
}

export async function setupHaskell(options?: HaskellOptions): Promise<void> {
  await haskellActionsSetup(haskellOptions(options))
}
