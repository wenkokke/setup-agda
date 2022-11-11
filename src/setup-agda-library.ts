import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as os from 'node:os'
import * as opts from './opts'
import * as util from './util'

export default async function setup(
  dist: opts.Dist,
  options: opts.BuildOptions
): Promise<void> {
  // Coerce string to {url: string; dir?: string; tag?: string}
  if (typeof dist === 'string') dist = {url: dist}

  core.info(`Download from ${dist.url}`)
  const tmpDir = await opts.downloadDist(dist)
  const agdaLibraryFiles = await findAgdaLibraryFiles(tmpDir)
  for (const agdaLibraryFile of agdaLibraryFiles) {
    const libraryName = path.basename(agdaLibraryFile, '.agda-lib')
    const libraryFrom = path.dirname(agdaLibraryFile)
    const libraryVersion = dist.tag ?? 'experimental'
    const libraryExperimental = dist.tag === undefined
    const libraryRelativeDir = path.relative(tmpDir, libraryFrom)
    core.info(
      `Found ${libraryName} version ${libraryVersion} at ${libraryRelativeDir}`
    )
    const libraryTo = opts.libraryDir(
      libraryName,
      libraryVersion,
      libraryExperimental
    )
    core.info(`Install ${libraryName} to ${libraryTo}`)
    await util.mkdirP(path.dirname(libraryTo))
    await util.cpR(libraryFrom, libraryTo)
    // TODO: clean up libraryFrom
    const libraryIsDefault =
      options['agda-libraries-default'].includes(libraryName)
    if (libraryIsDefault) core.info(`Register ${libraryName} as default`)
    util.registerAgdaLibrary(
      path.join(libraryTo, `${libraryName}.agda-lib`),
      libraryIsDefault
    )
  }
}

async function findAgdaLibraryFiles(dir: string): Promise<string[]> {
  const globber = await glob.create(
    [path.join(dir, '*.agda-lib'), path.join(dir, '**', '*.agda-lib')].join(
      os.EOL
    )
  )
  return await globber.glob()
}
