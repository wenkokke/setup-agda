import * as fs from 'node:fs'
import * as os from 'node:os'
import { agdaExecutablesFile } from '../util/appdirs.js'
import agda from '../util/deps/agda.js'

export default function registerExecutable(newExecutable: string): void {
  const oldExecutables = agda.readExecutablesSync()
  const newExecutables = [...oldExecutables, newExecutable]
  fs.writeFileSync(agdaExecutablesFile(), newExecutables.join(os.EOL))
}
