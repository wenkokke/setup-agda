declare module 'linux-os-info' {
  export interface LinuxOsInfo extends Partial<Record<string, string | Error>> {
    type: string
    platform: string
    hostname: string
    arch: string
    release: string
    file?: string | Error
  }

  function linuxOsInfo(opts: undefined): Promise<LinuxOsInfo>

  function linuxOsInfo(opts: { mode: 'sync' }): LinuxOsInfo

  function linuxOsInfo(opts: { mode: 'promise' }): Promise<LinuxOsInfo>

  function linuxOsInfo(opts: {
    mode: (this: null, info: LinuxOsInfo) => void
  }): void

  function linuxOsInfo(opts: {
    mode: 'promise' | 'sync' | ((this: null, info: LinuxOsInfo) => void)
  }): Partial<Record<string, string>>

  export default linuxOsInfo
}
