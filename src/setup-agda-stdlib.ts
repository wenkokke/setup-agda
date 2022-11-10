import * as core from '@actions/core'
import * as opts from './opts'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  if (options['agda-stdlib-version'] === 'none') return

  // Setup agda-stdlib:
  const libraryDir = opts.libraryDir(
    'standard-library',
    options['agda-stdlib-version'],
    options['agda-stdlib-version'] === 'experimental'
  )
  core.info(
    `Install agda-stdlib ${options['agda-stdlib-version']} to ${libraryDir}`
  )
  core.warning(`agda-stdlib: not implemented`)
}

// const librariesFile = path.join(opts.agdaDir(), 'libraries')
