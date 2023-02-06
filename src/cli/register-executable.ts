import ensureError from 'ensure-error'
import fs from 'fs-extra'
import * as os from 'node:os'
import * as path from 'node:path'
import { agdaExecutablesFile } from '../util/appdirs.js'
import agda from '../util/deps/agda.js'

export default function registerExecutable(newExecutable: string): void {
  const oldExecutables = agda.readExecutablesSync()
  const newExecutables = [...oldExecutables, newExecutable]
  const executablesFile = agdaExecutablesFile()
  fs.mkdirpSync(path.dirname(executablesFile))
  fs.writeFileSync(agdaExecutablesFile(), newExecutables.join(os.EOL))

  // Logging: print executables file
  if (logger.isDebug()) {
    try {
      logger.debug(
        [
          `${agdaExecutablesFile()}:`,
          ...agda.readExecutablesSync().map((exe) => `- ${exe}`)
        ].join(os.EOL)
      )
    } catch (error) {
      logger.warning(ensureError(error))
    }
  }
}
