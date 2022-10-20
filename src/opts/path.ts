import * as opts from './platform'
import * as path from 'node:path'
import * as os from 'node:os'

export function agdaDir(): string {
  switch (opts.platform) {
    case 'linux':
    case 'darwin':
      return path.join(os.homedir(), '.agda')
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}
