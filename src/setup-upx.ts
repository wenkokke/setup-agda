import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from './opts'
import * as exec from './util/exec'

export type UPXVersion = '3.96'

const upxUrlLinux =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz'
const upxUrlWindows =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip'

export default async function setup(upxVersion: UPXVersion): Promise<string> {
  const upxInstallDir = path.join(opts.agdaDir(), 'upx', upxVersion)
  switch (opts.os) {
    case 'linux': {
      const upxArchivePath = await tc.downloadTool(upxUrlLinux)
      const upxDir = await tc.extractTar(upxArchivePath, upxInstallDir, [
        '--extract',
        '--xz',
        '--preserve-permissions',
        '--strip-components=1'
      ])
      return path.join(upxDir, 'upx')
    }
    case 'macos': {
      await exec.getoutput('brew', ['install', 'upx'])
      return 'upx'
    }
    case 'windows': {
      const upxArchivePath = await tc.downloadTool(upxUrlWindows)
      const upxDir = await tc.extractZip(upxArchivePath, upxInstallDir)
      return path.join(upxDir, 'upx-3.96-win64', 'upx')
    }
  }
}
