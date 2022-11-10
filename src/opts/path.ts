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

export function cacheDir(name: string): string {
  const now = new Date(Date.now())
  const nowString = [
    now.getFullYear().toString().padStart(4, '0'),
    now.getMonth().toString().padStart(2, '0'),
    now.getDate().toString().padStart(2, '0'),
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0')
  ].join('')
  return path.join(agdaDir(), 'cache', `${name}-${nowString}`)
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}
