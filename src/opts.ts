export {
  runPreBuildHook,
  supportsSplitSections,
  supportsOptimiseHeavily,
  supportsClusterCounting,
  needsIcu
} from './opts/compat'
export {default as getOptions} from './opts/get-options'
export {Platform, platform, Arch, arch} from './opts/platform'
export {
  agdaDir,
  cacheDir,
  installDir,
  librariesDir,
  libraryDir
} from './opts/path'
export {default as resolveGhcVersion} from './opts/resolve-ghc-version'
export {default as resolveAgdaStdlibVersion} from './opts/resolve-agda-stdlib-version'
export {
  BuildOptions,
  SetupAgdaInputs,
  SetupHaskellInputs,
  agdaPackageInfoCache,
  BdistIndexEntry,
  agdaBdistIndex,
  agdaStdlibSdistIndex,
  AgdaVersion,
  isAgdaVersion,
  AgdaGitRef,
  isAgdaGitRef,
  AgdaStdlibVersion,
  isAgdaStdlibVersion
} from './opts/types'
