import {BuildOptions} from './opts/types'
import * as simver from './util/simver'

export {default as getOptions} from './opts/get-options'
export * from './opts/platform'
export * from './opts/appdirs'
export {default as resolveGhcVersion} from './opts/resolve-ghc-version'
export {default as resolveAgdaStdlibVersion} from './opts/resolve-agda-stdlib-version'
export {default as downloadDist} from './opts/download-dist'
export * from './opts/types'

export function needsIcu(options: Pick<BuildOptions, 'agda-version'>): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  return (
    options['agda-version'] === 'HEAD' ||
    simver.gte(options['agda-version'], '2.5.3')
  )
}
