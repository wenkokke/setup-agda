import * as core from '@actions/core'
import * as glob from '@actions/glob'
import path from 'node:path'
import * as opts from './opts'

export default async function setup(dist: opts.Dist): Promise<void> {
  // Coerce string to {url: string; dir?: string; tag?: string}
  if (typeof dist === 'string') dist = {url: dist}

  core.info(`Download from ${dist.url}`)
  const tmpDir = await opts.downloadDist(dist)

  const globber = await glob.create(path.join(tmpDir, '**', '*.agda-lib'))
  const agdaLibFiles = globber.glob()
  core.info(`Found .agda-lib files: ${JSON.stringify(agdaLibFiles)}`)
}
