import * as opts from './platform'
import * as path from 'node:path'
import * as os from 'node:os'
import * as tmp from 'tmp'

export function cacheDir(name: string): string {
  if (process.env.RUNNER_TEMP !== undefined) {
    return path.join(process.env.RUNNER_TEMP, name, yyyymmdd())
  } else {
    // TODO: register callback to remove tmp directory
    return tmp.dirSync().name
  }
}

// Directories for Agda installation:

/**
 * The directory where to store data related to Agda installations.
 *
 * Resolves to `~/.agda` on Linux and macOS and to `%AppData%\agda` on Windows.
 *
 * This is the directory where Agda conventionally stores the `libraries`,
 * `defaults`, and `executable` files.
 */
export function agdaDir(): string {
  switch (opts.platform) {
    case 'linux':
    case 'darwin':
      return path.join(os.homedir(), '.agda')
    case 'win32':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
}

/**
 * The directory to which to install the given Agda version.
 *
 * Resolves to `$agdaDir/agda/$version.
 */
export function installDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}

/**
 * The path to the global Agda libraries file.
 *
 * Resolves to `$agdaDir/libraries`.
 */
export function librariesFile(): string {
  return path.join(agdaDir(), 'libraries')
}

/**
 * The directory where to install Agda libraries.
 *
 * Resolves to `$agdaDir/libraries.d`.
 */
export function librariesDir(): string {
  return path.join(agdaDir(), 'libraries.d')
}

/**
 * The path to the global Agda defaults file.
 *
 * Resolves to `$agdaDir/defaults`.
 */
export function defaultsFile(): string {
  return path.join(agdaDir(), 'defaults')
}

/**
 * The path to the global Agda defaults file.
 *
 * Resolves to `$agdaDir/executables`.
 */
export function executablesFile(): string {
  return path.join(agdaDir(), 'executables')
}

/**
 * The directory where to install a specific Agda library.
 *
 * Resolves to `$agdaDir/libraries.d/$libraryName/$libraryVersion`.
 *
 * If the library is experimental, append the current date to the version.
 */
export function libraryDir(
  libraryName: string,
  libraryVersion: string,
  experimental = true
): string {
  if (experimental) libraryVersion += `-${yyyymmdd()}`
  return path.join(librariesDir(), libraryName, libraryVersion)
}

/**
 * The current date as `yyyymmdd`.
 */
function yyyymmdd(): string {
  const nowDate = new Date(Date.now())
  return [
    nowDate.getFullYear().toString().padStart(4, '0'),
    nowDate.getMonth().toString().padStart(2, '0'),
    nowDate.getDate().toString().padStart(2, '0')
  ].join('')
}
