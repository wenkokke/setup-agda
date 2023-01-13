import * as opts from './platform.js'
import * as path from 'node:path'
import * as os from 'node:os'

/**
 * The cache for `setup-agda`.
 *
 * Used to cache downloads, tools, etc.
 */
export function setupAgdaCacheDir(...parts: string[]): string {
  switch (opts.platform) {
    case 'linux':
      return path.join(os.homedir(), '.agdaup', ...parts)
    case 'macos':
      return path.join(os.homedir(), '.agdaup', ...parts)
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agdaup', ...parts)
  }
}

// Directories for Agda installation:

/**
 * The directory where Agda stores its global configuration files.
 *
 * By convention, we use the same directory for Agda and Agda library installations.
 *
 * Resolves to `~/.agda` on Linux and macOS and to `%AppData%\agda` on Windows.
 */
export function agdaDir(): string {
  switch (opts.platform) {
    case 'linux':
      return path.join(os.homedir(), '.agda')
    case 'macos':
      return path.join(os.homedir(), '.agda')
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
}

/**
 * The directory to which to install the given Agda version.
 *
 * Resolves to `$agdaDir/agda/$version.
 */
export function agdaInstallDir(version: string): string {
  return path.join(agdaDir(), 'agda', version)
}

/**
 * The directory to use as a cache.
 *
 * Resolves to `$agdaDir/caches/$paths
 */
export function agdaCacheDir(...paths: string[]): string {
  return path.join(agdaDir(), 'caches', ...paths)
}

/**
 * The path to the global Agda libraries file.
 *
 * Resolves to `$agdaDir/libraries`.
 */
export function agdaLibrariesFile(): string {
  return path.join(agdaDir(), 'libraries')
}

/**
 * The path to the global Agda defaults file.
 *
 * Resolves to `$agdaDir/defaults`.
 */
export function agdaDefaultsFile(): string {
  return path.join(agdaDir(), 'defaults')
}

/**
 * The path to the global Agda defaults file.
 *
 * Resolves to `$agdaDir/executables`.
 */
export function agdaExecutablesFile(): string {
  return path.join(agdaDir(), 'executables')
}

/**
 * The directory where to install Agda libraries.
 *
 * Resolves to `$agdaDir/libraries.d`.
 */
export function agdaLibrariesInstallDir(): string {
  return path.join(agdaDir(), 'libraries.d')
}

/**
 * The directory where to install a specific Agda library.
 *
 * Resolves to `$agdaDir/libraries.d/$libraryName/$libraryVersion`.
 *
 * If the library is experimental, append the current date to the version.
 */
export function agdaLibraryInstallDir(
  libraryName: string,
  libraryVersion: string,
  experimental = true
): string {
  if (experimental) libraryVersion += `-${yyyymmdd()}`
  return path.join(agdaLibrariesInstallDir(), libraryName, libraryVersion)
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
