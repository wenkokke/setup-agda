import * as path from 'node:path'
import { agdaupCacheDir } from '../util/appdirs.js'
import brew from '../util/deps/homebrew.js'
import { platform } from '../util/platform.js'
import * as simver from '../util/simver.js'
import download from '../util/download-helper'

const version = '3.96'

export default async function setupUpx(): Promise<string> {
  switch (platform) {
    case 'linux': {
      const dest = agdaupCacheDir(path.join('upx', version))
      return await download(
        {
          url: `https://github.com/upx/upx/releases/download/v${version}/upx-${version}-amd64_linux.tar.xz`,
          dir: `upx-${version}-amd64_linux`,
          distType: 'txz'
        },
        dest
      )
    }
    case 'macos': {
      // NOTE: does not respect the upxVersion variable
      // NOTE: patch version '3.96_1' and (presumably) later versions are OK
      let upxVersion = await brew.getVersion('upx')
      if (upxVersion === undefined) await brew(['install', 'upx'])
      else if (simver.lt(upxVersion, '3.96_1')) await brew(['upgrade', 'upx'])
      upxVersion = await brew.getVersion('upx')
      if (upxVersion === undefined) throw Error(`Could not install UPX`)
      return 'upx'
    }
    case 'windows': {
      const dest = agdaupCacheDir(path.join('upx', version))
      return await download(
        {
          url: `https://github.com/upx/upx/releases/download/v${version}/upx-${version}-win64.zip`,
          dir: `upx-${version}-win64`,
          distType: 'zip'
        },
        dest
      )
    }
  }
}
