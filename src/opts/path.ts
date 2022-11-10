import * as opts from './platform'
import * as path from 'node:path'
import * as os from 'node:os'
import * as tmp from 'tmp'

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
  if (process.env.RUNNER_TEMP !== undefined) {
    return path.join(process.env.RUNNER_TEMP, name, yyyymmdd())
  } else {
    // TODO: register callback to remove tmp directory
    return tmp.dirSync().name
  }
}

export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}

export function librariesFile(): string {
  return path.join(agdaDir(), 'libraries')
}

export function librariesDir(): string {
  return path.join(agdaDir(), 'libraries.d')
}

export function defaultsFile(): string {
  return path.join(agdaDir(), 'defaults')
}

export function libraryDir(
  libraryName: string,
  libraryVersion: string,
  experimental = true
): string {
  if (experimental) libraryVersion += `-${yyyymmdd()}`
  return path.join(librariesDir(), libraryName, libraryVersion)
}

function yyyymmdd(): string {
  const nowDate = new Date(Date.now())
  return [
    nowDate.getFullYear().toString().padStart(4, '0'),
    nowDate.getMonth().toString().padStart(2, '0'),
    nowDate.getDate().toString().padStart(2, '0')
  ].join('')
}
