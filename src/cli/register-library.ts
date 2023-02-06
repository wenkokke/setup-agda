import assert from 'node:assert'
import fs from 'fs-extra'
import * as os from 'node:os'
import * as path from 'node:path'
import { agdaDefaultsFile, agdaLibrariesFile } from '../util/appdirs.js'
import agda from '../util/deps/agda.js'
import ensureError from 'ensure-error'

export default function registerLibrary(
  libraryFile: string,
  isDefault = false
): void {
  // Check agdaLibraryFile exists & refers to an agda-lib file:
  assert(
    fs.existsSync(libraryFile),
    `Could not find .agda-lib file: ${libraryFile}`
  )
  const newLibrary = path.parse(path.resolve(libraryFile))
  assert(
    newLibrary.ext === '.agda-lib',
    `Library file path does not end in .agda-lib: ${libraryFile}`
  )

  // Load the current libraries file:
  const oldLibraries = agda.readLibrariesSync()
  if (oldLibraries.some((oldLibrary) => oldLibrary.name === newLibrary.name))
    logger.warning(
      `Agda libraries file already contains a copy of ${newLibrary.name}`
    )
  const newLibraries = [...oldLibraries, newLibrary]
  const librariesFile = agdaLibrariesFile()
  fs.mkdirpSync(path.dirname(librariesFile))
  fs.writeFileSync(
    librariesFile,
    newLibraries
      .map((libraryParsedPath) => path.format(libraryParsedPath))
      .join(os.EOL)
  )

  // Add the library to defaults:
  if (isDefault === true) {
    const oldDefaults = agda.readDefaultsSync()
    const newDefaults = [...oldDefaults, newLibrary.name]
    const defaultsFile = agdaDefaultsFile()
    fs.mkdirpSync(path.dirname(defaultsFile))
    fs.writeFileSync(defaultsFile, newDefaults.join(os.EOL))
  }

  // Logging: print libraries file
  if (logger.isDebug()) {
    try {
      logger.debug(
        [
          `${agdaLibrariesFile()}:`,
          ...agda.readLibrariesSync().map((exe) => `- ${exe}`)
        ].join(os.EOL)
      )
    } catch (error) {
      logger.warning(ensureError(error))
    }
  }

  // Logging: print defaults file
  if (logger.isDebug()) {
    try {
      logger.debug(
        [
          `${agdaDefaultsFile()}:`,
          ...agda.readDefaultsSync().map((exe) => `- ${exe}`)
        ].join(os.EOL)
      )
    } catch (error) {
      logger.warning(ensureError(error))
    }
  }
}
