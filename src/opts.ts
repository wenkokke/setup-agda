export {
  runPreBuildHook,
  supportsSplitSections,
  supportsOptimiseHeavily,
  supportsClusterCounting,
  needsIcu
} from './opts/compat'
export {default as findBdist} from './opts/find-bdist'
export {default as getOptions} from './opts/get-options'
export {os} from './opts/os'
export {agdaDir, installDir} from './opts/path'
export {default as resolveGhcVersion} from './opts/resolve-ghc-version'
export {BuildOptions, SetupAgdaInputs, SetupHaskellInputs} from './opts/types'
