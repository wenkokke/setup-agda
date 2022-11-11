import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as os from 'node:os'
import * as opts from './opts'

export default async function setup(dist: opts.Dist): Promise<void> {
  // Coerce string to {url: string; dir?: string; tag?: string}
  if (typeof dist === 'string') dist = {url: dist}

  core.info(`Download from ${dist.url}`)
  const tmpDir = await opts.downloadDist(dist)

  const globber = await glob.create(
    [
      path.join(tmpDir, '*.agda-lib'),
      path.join(tmpDir, '**', '*.agda-lib')
    ].join(os.EOL)
  )
  const agdaLibFiles = await globber.glob()
  core.info(`Found .agda-lib files: ${JSON.stringify(agdaLibFiles)}`)
}
