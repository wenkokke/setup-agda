import macosRelease from 'macos-release'
import linuxRelease from 'linux-os-info'
import windowsRelease from 'windows-release'
import { release as osRelease } from 'node:os'
import ensureError from 'ensure-error'

export type Platform = 'linux' | 'macos' | 'windows'

export const platform = ((): Platform => {
  switch (process.platform) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'macos'
    case 'win32':
      return 'windows'
    default:
      throw Error(`Unsupported platform ${process.platform}`)
  }
})()

export type Arch =
  | 'arm'
  | 'arm64'
  | 'ia32'
  | 'mips'
  | 'mipsel'
  | 'ppc'
  | 'ppc64'
  | 's390'
  | 's390x'
  | 'x64'

export const arch: Arch = (() => {
  if (process.arch !== 'x64')
    logger.warning(`Support for ${process.arch} is experimental`)
  return process.arch
})()

export const release = ((): string => {
  switch (platform) {
    case 'macos': {
      const releaseInfo = macosRelease(osRelease())
      if (releaseInfo?.version !== undefined) {
        return `macos-${releaseInfo.version}`
      } else {
        logger.warning('Could not determine macOS release')
        return 'macos-unknown'
      }
    }
    case 'linux': {
      try {
        const releaseInfo = linuxRelease({ mode: 'sync' })
        const releaseId =
          typeof releaseInfo.id === 'string' ? releaseInfo.id : null
        const releaseVersionId =
          typeof releaseInfo.version_id === 'string'
            ? releaseInfo.version_id
            : null
        if (releaseId !== null && releaseVersionId !== null) {
          return `${releaseInfo.id}-${releaseInfo.version_id}`
        }
      } catch (error) {
        logger.warning(
          `Could not determine Linux release: ${ensureError(error).message}`
        )
      }
      return 'linux-unknown'
    }
    case 'windows': {
      const releaseInfo = windowsRelease(osRelease())
      const releaseSlug = releaseInfo.toLowerCase().replace(/^server\s+/, '')
      return `windows-${releaseSlug}`
    }
  }
})()
