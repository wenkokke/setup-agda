import * as tc from '@actions/tool-cache'
import * as path from 'path'
import * as opts from '../opts'
import * as agda from './agda'
import * as exec from './exec'

export type UPXVersion = '3.96'

const upxUrlLinux =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz'
const upxUrlWindows =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip'

function installDir(version: string): string {
  return path.join(agda.agdaDir(), 'upx', version)
}

export async function installUPX(upxVersion: UPXVersion): Promise<string> {
  switch (opts.os) {
    case 'linux': {
      const upxArchivePath = await tc.downloadTool(upxUrlLinux)
      const upxDir = await tc.extractTar(
        upxArchivePath,
        installDir(upxVersion),
        ['--extract', '--xz', '--preserve-permissions', '--strip-components=1']
      )
      return path.join(upxDir, 'upx')
    }
    case 'macos': {
      await exec.execOutput('brew', ['install', 'upx'])
      return 'upx'
    }
    case 'windows': {
      const upxArchivePath = await tc.downloadTool(upxUrlWindows)
      const upxDir = await tc.extractZip(upxArchivePath, installDir(upxVersion))
      return path.join(upxDir, 'upx-3.96-win64', 'upx')
    }
  }
}
