import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

export async function upxSetup(options: opts.BuildOptions): Promise<string> {
  switch (opts.platform) {
    case 'linux':
      return await upxSetupForLinux(options)
    case 'darwin':
      return await upxSetupForMacOS(options)
    case 'win32':
      return await upxSetupForWindows(options)
  }
}

async function upxSetupForLinux(options: opts.BuildOptions): Promise<string> {
  const upxVersion = '3.96'
  options['upx-version'] = upxVersion
  const upxPkgUrl = `https://github.com/upx/upx/releases/download/v${upxVersion}/upx-${upxVersion}-amd64_linux.tar.xz`
  const upxDir = opts.setupAgdaCacheDir(path.join('upx', upxVersion))
  const upxTar = await tc.downloadTool(upxPkgUrl)
  const upxDirTC = await tc.extractTar(upxTar, upxDir, [
    '--extract',
    '--xz',
    '--preserve-permissions',
    '--strip-components=1'
  ])
  return path.join(upxDirTC, 'upx')
}

async function upxSetupForMacOS(options: opts.BuildOptions): Promise<string> {
  // Ensure UPX is installed and is the correct version:
  // NOTE: patch version '3.96_1' and (presumably) later versions are OK
  let upxVersion = await util.brewGetVersion('upx')
  if (upxVersion === undefined) await util.brew('install', 'upx')
  else if (util.simver.lt(upxVersion, '3.96_1'))
    await util.brew('upgrade', 'upx')
  upxVersion = await util.brewGetVersion('upx')
  if (upxVersion === undefined) throw Error(`Could not install UPX`)
  options['upx-version'] = upxVersion
  return 'upx'
}

async function upxSetupForWindows(options: opts.BuildOptions): Promise<string> {
  const upxVersion = '3.96'
  options['upx-version'] = upxVersion
  const upxDir = opts.setupAgdaCacheDir(path.join('upx', upxVersion))
  const upxPkgUrl = `https://github.com/upx/upx/releases/download/v${upxVersion}/upx-${upxVersion}-win64.zip`
  const upxZip = await tc.downloadTool(upxPkgUrl)
  const upxDirTC = await tc.extractZip(upxZip, upxDir)
  return path.join(upxDirTC, `upx-${upxVersion}-win64`, 'upx')
}
