import * as core from '@actions/core'
// import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from './opts'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  if (options['agda-stdlib-version'] === 'none') return

  // Setup agda-stdlib:
  const agdaStdlibDir =
    options['agda-stdlib-version'] === 'experimental'
      ? libraryDirForExperimental('standard-library')
      : libraryDir('standard-library', options['agda-stdlib-version'])
  core.info(
    `Install agda-stdlib ${options['agda-stdlib-version']} to ${agdaStdlibDir}`
  )
  core.warning(`agda-stdlib: not implemented`)
}

// const librariesFile = path.join(opts.agdaDir(), 'libraries')

function libraryDir(libraryName: string, libraryVersion: string): string {
  return path.join(opts.agdaDir(), 'libraries.d', libraryName, libraryVersion)
}

function libraryDirForExperimental(libraryName: string): string {
  const today = new Date(Date.now())
  const yyyymmdd = [
    today.getFullYear().toString(),
    (today.getMonth() + 1).toString().padStart(2, '0'),
    today.getDate().toString().padStart(2, '0')
  ].join('-')
  return path.join(libraryDir(libraryName, 'experimental'), yyyymmdd)
}
