import * as exec from '@actions/exec'
import haskellActionsSetup from 'setup-haskell'
import {execOutput, progVersion} from './util/exec'

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('cabal', args, execOptions)
}

export async function ghc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await execOutput('ghc', args, execOptions)
}

export async function getGHCVersion(): Promise<string> {
  return progVersion('ghc', '--numeric-version')
}

export async function getCabalVersion(): Promise<string> {
  return progVersion('cabal', '--numeric-version')
}

export async function setupHaskell(
  inputs: Record<string, string>
): Promise<void> {
  await haskellActionsSetup(inputs)
}
