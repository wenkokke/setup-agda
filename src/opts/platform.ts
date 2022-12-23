import * as logging from '../util/logging'

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
    logging.warning(`Support for ${process.arch} is experimental`)
  return process.arch
})()
