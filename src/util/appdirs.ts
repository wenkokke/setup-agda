import * as opts from './platform.js'
import * as path from 'node:path'
import * as os from 'node:os'

// Directories for agdaup:

/**
 * The directory where agdaup stores its global configuration files.
 *
 * By convention, we use the same directory for Agda and Agda library installations.
 *
 * Resolves to `~/.agda` on Linux and macOS and to `%AppData%\agda` on Windows.
 */
export function agdaupDir(): string {
  switch (opts.platform) {
    case 'linux':
    case 'macos':
      return path.join(os.homedir(), '.agdaup')
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agdaup')
  }
}

/**
 * The cache for `setup-agda`.
 *
 * The directory to use as a cache.
 *
 * Resolves to `$agdaupDir/cache/$paths
 */
export function agdaupCacheDir(...parts: string[]): string {
  return path.join(agdaupDir(), 'cache', ...parts)
}

/**
 * The directory to which to install the given Agda version.
 *
 * Resolves to `$agdaupDir` or `$agdaupDir/agda/$version`.
 */
export function agdaInstallDir(version?: string): string {
  if (version === undefined) {
    return agdaupDir()
  } else {
    return path.join(agdaupDir(), 'agda', version)
  }
}

/**
 * The directory to which to install the binaries for the given Agda version.
 *
 * Resolves to `$agdaupDir/bin` or `$agdaupDir/agda/$version/bin`.
 */
export function agdaBinDir(version?: string): string {
  return path.join(agdaInstallDir(version), 'bin')
}

/**
 * The directory to which to install the data for the given Agda version.
 *
 * Resolves to `$agdaupDir/data` or `$agdaupDir/agda/$version/data`.
 */
export function agdaDataDir(version?: string): string {
  return path.join(agdaInstallDir(version), 'data')
}

// Directories for agda:

/**
 * The directory where Agda stores its global configuration files.
 *
 * Resolves to `~/.agda` on Linux and macOS and to `%AppData%\agda` on Windows.
 */
export function agdaDir(): string {
  switch (opts.platform) {
    case 'linux':
    case 'macos':
      return path.join(os.homedir(), '.agda')
    case 'windows':
      return path.join(os.homedir(), 'AppData', 'Roaming', 'agda')
  }
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
export function agdaDefaultsFile(version?: string): string {
  return path.join(
    version === undefined ? agdaDir() : agdaInstallDir(version),
    'defaults'
  )
}

/**
 * The path to the global Agda defaults file.
 *
 * Resolves to `$agdaDir/executables`.
 */
export function agdaExecutablesFile(version?: string): string {
  return path.join(
    version === undefined ? agdaDir() : agdaInstallDir(version),
    'executables'
  )
}

/**
 * The directory where to install Agda libraries.
 *
 * Resolves to `$agdaupDir/libraries.d`.
 */
export function agdaLibrariesInstallDir(version?: string): string {
  return path.join(
    version === undefined ? agdaDir() : agdaInstallDir(version),
    'libraries.d'
  )
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
