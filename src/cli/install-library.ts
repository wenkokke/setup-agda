import glob from 'glob'
import path from 'node:path'
import fs from 'fs-extra'
import { agdaLibraryInstallDir } from '../util/appdirs.js'
import download from '../util/download-helper.js'
import { AgdaLibNotFound } from '../util/errors.js'
import { Dist } from '../util/types.js'

// TODO: Add custom logic for installing known libraries, which currently means the standard library.

export default async function installLibrary(dist: Dist): Promise<string> {
  // Coerce string to {url: string; dir?: string; tag?: string}
  if (typeof dist === 'string') dist = { url: dist }

  const tmpDir = await download(dist)
  const [agdaLibraryFile] = findAgdaLibraryFiles(tmpDir)
  if (agdaLibraryFile === undefined) throw new AgdaLibNotFound(tmpDir)
  const libraryName = path.basename(agdaLibraryFile, '.agda-lib')
  const libraryFrom = path.dirname(agdaLibraryFile)
  const libraryVersion = dist.tag ?? 'experimental'
  const libraryExperimental = dist.tag === undefined
  logger.info(
    [
      `Found ${libraryName} version ${libraryVersion} at`,
      path.relative(tmpDir, libraryFrom) ?? 'repository root'
    ].join(' ')
  )
  const libraryTo = agdaLibraryInstallDir(
    libraryName,
    libraryVersion,
    libraryExperimental
  )
  await fs.mkdirp(path.dirname(libraryTo))
  await fs.copy(libraryFrom, libraryTo)
  logger.info(`Installed ${libraryName} to ${libraryTo}`)
  return path.join(libraryTo, `${libraryName}.agda-lib`)
}

function findAgdaLibraryFiles(dir: string): string[] {
  return [
    glob.sync(path.join(dir, '*.agda-lib')),
    glob.sync(path.join(dir, '**', '*.agda-lib'))
  ].flat()
}
