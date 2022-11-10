import * as core from '@actions/core'
import path from 'node:path'
import * as opts from './opts'
import * as util from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  if (options['agda-stdlib-version'] === 'none') return

  // Setup agda-stdlib:
  const standardLibraryDir = opts.libraryDir(
    'standard-library',
    options['agda-stdlib-version'],
    options['agda-stdlib-version'] === 'experimental'
  )
  core.info(
    `Install agda-stdlib ${options['agda-stdlib-version']} to ${standardLibraryDir}`
  )
  const standardLibraryDistIndexEntry =
    opts.agdaStdlibSdistIndex[options['agda-stdlib-version']]
  if (standardLibraryDistIndexEntry === undefined)
    throw Error(
      `Unsupported agda-stdlib version: '${options['agda-stdlib-version']}'`
    )
  await opts.downloadDistIndexEntry(
    standardLibraryDistIndexEntry,
    standardLibraryDir
  )
  util.registerAgdaLibrary(
    path.join(standardLibraryDir, 'standard-library.agda-lib'),
    options['agda-stdlib-default']
  )
}
