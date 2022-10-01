import * as setup_haskell from 'setup-haskell'

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

export async function setupHaskell(inputs?: HaskellOptions): Promise<void> {
  setup_haskell.run(inputs ?? {})
}
