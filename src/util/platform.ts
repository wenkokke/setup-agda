import macosRelease from 'macos-release'
import windowsRelease from 'windows-release'
import { release as osRelease } from 'node:os'

export type Platform = 'linux' | 'darwin' | 'win32'

export const platform = ((): Platform => {
  switch (process.platform) {
    case 'linux':
      return 'linux'
    case 'darwin':
      return 'darwin'
    case 'win32':
      return 'win32'
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
    case 'darwin': {
      const releaseInfo = macosRelease(osRelease())
      if (releaseInfo?.version !== undefined) {
        return `macos-${releaseInfo.version}`
      } else {
        logger.warning('Could not determine macOS release')
        return 'macos-unknown'
      }
    }
    case 'linux': {
      return ''
    }
    case 'win32': {
      const releaseInfo = windowsRelease(osRelease())
      const releaseSlug = releaseInfo.toLowerCase().replace(' ', '-')
      return `windows-${releaseSlug}`
    }
  }
})()
