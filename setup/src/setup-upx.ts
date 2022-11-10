import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from './opts'
import * as util from './util'

export default async function setup(
  options: opts.BuildOptions
): Promise<string> {
  switch (opts.platform) {
    case 'linux':
      return await setupLinux(options)
    case 'darwin':
      return await setupMacOS(options)
    case 'win32':
      return await setupWindows(options)
  }
}

async function setupLinux(options: opts.BuildOptions): Promise<string> {
  const upxPkgUrl =
    'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz'
  const upxTar = await tc.downloadTool(upxPkgUrl)
  const upxDir = await tc.extractTar(upxTar, undefined, [
    '--extract',
    '--xz',
    '--preserve-permissions',
    '--strip-components=1'
  ])
  options['upx-version'] = '3.96'
  return path.join(upxDir, 'upx')
}

async function setupMacOS(options: opts.BuildOptions): Promise<string> {
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

async function setupWindows(options: opts.BuildOptions): Promise<string> {
  const upxPkgUrl =
    'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip'
  const upxZip = await tc.downloadTool(upxPkgUrl)
  const upxDir = await tc.extractZip(upxZip)
  options['upx-version'] = '3.96'
  return path.join(upxDir, 'upx-3.96-win64', 'upx')
}
