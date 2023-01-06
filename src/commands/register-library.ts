import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { agdaDefaultsFile, agdaLibrariesFile } from '../util/appdirs.js'
import agda from '../util/deps/agda.js'

export default function registerLibrary(
  libraryFile: string,
  isDefault = false
): void {
  // Check agdaLibraryFile exists & refers to an agda-lib file:
  assert(fs.existsSync(libraryFile))
  const newLibrary = path.parse(path.resolve(libraryFile))
  assert(newLibrary.ext === '.agda-lib')

  // Load the current libraries file:
  const oldLibraries = agda.readLibrariesSync()
  if (oldLibraries.some((oldLibrary) => oldLibrary.name === newLibrary.name))
    logger.warning(
      `Agda libraries file already contains a copy of ${newLibrary.name}`
    )
  const newLibraries = [...oldLibraries, newLibrary]
  fs.writeFileSync(
    agdaLibrariesFile(),
    newLibraries
      .map((libraryParsedPath) => path.format(libraryParsedPath))
      .join(os.EOL)
  )

  // Add the library to defaults:
  if (isDefault === true) {
    const oldDefaults = agda.readDefaultsSync()
    const newDefaults = [...oldDefaults, newLibrary.name]
    fs.writeFileSync(agdaDefaultsFile(), newDefaults.join(os.EOL))
  }
}
