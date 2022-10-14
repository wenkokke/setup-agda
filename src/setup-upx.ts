import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from './opts'
import {brew, brewGetVersion, simver} from './util'

const upxUrlLinux =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz'
const upxUrlWindows =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip'

export default async function setup(
  options: opts.BuildOptions
): Promise<string> {
  switch (opts.os) {
    case 'linux': {
      const upxTarPath = await tc.downloadTool(upxUrlLinux)
      const upxParentDir = await tc.extractTar(upxTarPath, undefined, [
        '--extract',
        '--xz',
        '--preserve-permissions'
      ])
      options['upx-version'] = '3.96'
      return path.join(upxParentDir, 'upx-3.96-amd64_linux', 'upx')
    }
    case 'macos': {
      // Ensure UPX is installed and is the correct version:
      // NOTE: patch version '3.96_1' and (presumably) later versions are OK
      let upxVersion = await brewGetVersion('upx')
      if (upxVersion === undefined) await brew('install', 'upx')
      else if (simver.lt(upxVersion, '3.96_1')) await brew('upgrade', 'upx')
      upxVersion = await brewGetVersion('upx')
      if (upxVersion === undefined) throw Error(`Could not install UPX`)
      options['upx-version'] = upxVersion
      return 'upx'
    }
    case 'windows': {
      const upxZipPath = await tc.downloadTool(upxUrlWindows)
      const upxParentDir = await tc.extractZip(upxZipPath)
      options['upx-version'] = '3.96'
      return path.join(upxParentDir, 'upx-3.96-win64', 'upx')
    }
  }
}
