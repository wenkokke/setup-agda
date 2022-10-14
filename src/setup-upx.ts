import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from './opts'
import * as exec from './util/exec'
import * as simver from './util/simver'

const upxUrlLinux =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz'
const upxUrlWindows =
  'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip'

export default async function setup(): Promise<string> {
  switch (opts.os) {
    case 'linux': {
      const upxTarPath = await tc.downloadTool(upxUrlLinux)
      const upxParentDir = await tc.extractTar(upxTarPath, undefined, [
        '--extract',
        '--xz',
        '--preserve-permissions'
      ])
      return path.join(upxParentDir, 'upx-3.96-amd64_linux', 'upx')
    }
    case 'macos': {
      // Ensure UPX is installed:
      let upxVer = await brewGetVersion('upx')
      if (upxVer === undefined) await brew('install', 'upx')
      upxVer = await brewGetVersion('upx')
      if (upxVer === undefined) throw Error(`Could not setup UPX`)

      // Check if UPX is the correct version:
      // NOTE: patch version '3.96_1' or (presumably) later versions are OK
      if (simver.gte(upxVer, '3.96_1')) return 'upx'

      // Attempt to upgrade UPX:
      await brew('upgrade', 'upx')
      upxVer = await brewGetVersion('upx')
      if (upxVer === undefined) throw Error(`Could not setup UPX`)
      if (simver.gte(upxVer, '3.96_1')) return 'upx'
      throw Error(`Could not setup UPX`)
    }
    case 'windows': {
      const upxZipPath = await tc.downloadTool(upxUrlWindows)
      const upxParentDir = await tc.extractZip(upxZipPath)
      return path.join(upxParentDir, 'upx-3.96-win64', 'upx')
    }
  }
}

const brew = async (...args: string[]): Promise<string> =>
  await exec.getoutput('brew', args)

const brewGetVersion = async (formula: string): Promise<string | undefined> => {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  const formulaVersions = await brew('list', '--formula', '--versions')
  return formulaVersions.match(formulaVersionRegExp)?.groups?.version
}
