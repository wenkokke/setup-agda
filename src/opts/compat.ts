import {simver} from '../util'
import * as opts from './os'
import {BuildOptions} from './types'

export function getConfigureOptions(options: BuildOptions): string[] {
  return options['configure-options'].split(/\s+/g).filter(opt => opt !== '')
}

export function supportsSplitSections(options: BuildOptions): boolean {
  // NOTE:
  //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
  //   https://github.com/agda/agda/issues/5940
  const osOK = opts.os === 'linux' || opts.os === 'windows'
  // NOTE:
  //   We only set --split-sections if Ghc >=8.0 and Cabal >=2.2, when the flag was added:
  //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
  const ghcVersionOK = simver.gte(options['ghc-version'], '8.0')
  const cabalVersionOK = simver.gte(options['cabal-version'], '2.2')
  return osOK && ghcVersionOK && cabalVersionOK
}

export function supportsOptimiseHeavily(options: BuildOptions): boolean {
  // NOTE:
  //   We only enable --optimise-heavily on versions which support it,
  //   i.e., versions after 2.6.2:
  //   https://github.com/agda/agda/blob/1175c41210716074340da4bd4caa09f4dfe2cc1d/doc/release-notes/2.6.2.md
  return simver.gte(options['agda-version'], '2.6.2')
}

export function supportsClusterCounting(options: BuildOptions): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  // NOTE:
  //   Agda versions 2.5.3 - 2.6.2 depend on text-icu ^0.7, but versions
  //   0.7.0.0 - 0.7.1.0 do not compile with icu68+, which can be solved
  //   by passing '--constraint="text-icu >= 0.7.1.0"'
  return simver.gte(options['agda-version'], '2.5.3')
}

export function needsIcu(options: BuildOptions): boolean {
  return (
    supportsClusterCounting(options) && !options['force-no-cluster-counting']
  )
}
