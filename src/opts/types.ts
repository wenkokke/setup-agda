import * as hackage from '../util/hackage'

// Inputs for haskell/actions/setup:

export type SetupHaskellOption =
  | 'cabal-version'
  | 'ghc-version'
  | 'stack-version'

export type SetupHaskellFlag =
  | 'disable-matcher'
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'

export interface SetupHaskellInputs
  extends Record<SetupHaskellOption, string>,
    Record<SetupHaskellFlag, boolean> {}

// Inputs for wenkokke/setup-agda:

export type SetupAgdaOption =
  | 'agda-version'
  | 'bdist-name'
  | 'configure-options'
  | 'ghc-version-range'
  | 'pre-build-hook'
  | SetupHaskellOption

export type SetupAgdaFlag =
  | 'bdist-compress-exe'
  | 'bdist-upload'
  | 'force-cluster-counting'
  | 'force-no-cluster-counting'
  | 'force-build'
  | 'force-no-build'
  | 'ghc-version-match-exact'
  | SetupHaskellFlag

export interface SetupAgdaInputs
  extends Record<SetupAgdaOption, string>,
    Record<SetupAgdaFlag, boolean> {}

// Build options for this action:

export interface BuildOptions extends SetupAgdaInputs {
  'extra-include-dirs': string[]
  'extra-lib-dirs': string[]
  'icu-version'?: string
  'package-info-cache'?: hackage.PackageInfoCache
  'upx-version'?: string
}
