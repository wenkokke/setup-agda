import * as opts from './os'
import * as path from 'node:path'
import * as os from 'node:os'

export function agdaDir(): string {
  switch (opts.os) {
    case 'linux':
    case 'macos':
      return path.join(os.homedir(), '.agda')
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}
