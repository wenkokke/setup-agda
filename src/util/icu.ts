import * as tc from '@actions/tool-cache'
import * as path from 'path'
import * as opts from '../opts'
import * as exec from './exec'
import * as simver from './simver'
import * as agda from './agda'

// System directories

function installDir(version: string): string {
  return path.join(agda.agdaDir(), 'icu', version)
}

// Install LibICU

type LibICU = '67.1' | '71.1'

export function icuVersionRange(options: opts.SetupOptions): LibICU | null {
  if (simver.gte(options['agda-version'], '2.6.2')) {
    return '71.1'
  } else if (simver.gte(options['agda-version'], '2.5.3')) {
    // agda >=2.5.3, <2.6.2 depends on text-icu ^0.7, but
    // text-icu <0.7.1.0 fails to compile with icu68+
    return '67.1'
  } else {
    return null
  }
}

const icu67UrlWindows =
  'https://github.com/unicode-org/icu/releases/download/release-67-1/icu4c-67_1-Win64-MSVC2017.zip'
const icu71UrlWindows =
  'https://github.com/unicode-org/icu/releases/download/release-71-1/icu4c-71_1-Win64-MSVC2019.zip'
const icu67UrlLinux =
  'https://github.com/unicode-org/icu/releases/download/release-67-1/icu4c-67_1-Ubuntu18.04-x64.tgz'
const icu71UrlLinux =
  'https://github.com/unicode-org/icu/releases/download/release-71-1/icu4c-71_1-Ubuntu20.04-x64.tgz'

export async function installLibICU(
  version: LibICU
): Promise<{libDir: string; includeDir: string}> {
  switch (opts.os) {
    case 'windows': {
      let icuPath = ''
      let icuDir = ''
      switch (version) {
        case '67.1':
          icuPath = await tc.downloadTool(icu67UrlWindows)
          icuDir = 'icu4c-67_1-Win64-MSVC2017'
          break
        case '71.1':
          icuPath = await tc.downloadTool(icu71UrlWindows)
          icuDir = 'icu4c-71_1-Win64-MSVC2019'
          break
      }
      const installDirTC = await tc.extractZip(icuPath, installDir(version))
      return {
        libDir: path.join(installDirTC, icuDir, 'bin64'),
        includeDir: path.join(installDirTC, icuDir, 'include')
      }
    }
    case 'linux': {
      let icuPath = ''
      switch (version) {
        case '67.1':
          icuPath = await tc.downloadTool(icu67UrlLinux)
          break
        case '71.1':
          icuPath = await tc.downloadTool(icu71UrlLinux)
          break
      }
      const installDirTC = await tc.extractTar(icuPath, installDir(version), [
        '--extract',
        '--gzip',
        '--strip-components=4'
      ])
      return {
        libDir: path.join(installDirTC, 'lib'),
        includeDir: path.join(installDirTC, 'include')
      }
    }
    case 'macos': {
      switch (version) {
        case '71.1': {
          const brewPrefix = (
            await exec.execOutput('brew', ['--prefix'])
          ).trim()
          await exec.execOutput('brew', ['install', 'icu4c'])
          const installPath = path.join(brewPrefix, 'opt', 'icu4c')
          return {
            libDir: path.join(installPath, 'lib'),
            includeDir: path.join(installPath, 'include')
          }
        }
      }
      break
    }
  }
  throw Error(`Could not install ICU-${version} for ${opts.os}`)
}
