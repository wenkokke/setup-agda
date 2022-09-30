import {exec, ExecOptions} from '@actions/exec'

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

export async function setupHaskell(options: HaskellOptions): Promise<void> {
  const execOptions: ExecOptions = {}
  execOptions.env = {}
  if (options.ghc_version !== undefined) {
    execOptions.env['INPUT_GHC-VERSION'] = options.ghc_version
  }
  if (options.cabal_version !== undefined) {
    execOptions.env['INPUT_CABAL-VERSION'] = options.cabal_version
  }
  if (options.stack_version !== undefined) {
    execOptions.env['INPUT_STACK-VERSION'] = options.stack_version
  }
  if (options.enable_stack === true) {
    execOptions.env['INPUT_ENABLE-STACK'] = '1'
  }
  if (options.stack_no_global === true) {
    execOptions.env['INPUT_STACK-NO-GLOBAL'] = '1'
  }
  if (options.stack_setup_ghc === true) {
    execOptions.env['INPUT_STACK-SETUP-GHC'] = '1'
  }
  if (options.disable_matcher === true) {
    execOptions.env['INPUT_DISABLE-MATCHER'] = '1'
  }
  await exec('node vendor/haskell/actions/setup/dist/index.js', [], execOptions)
}
