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

// Resolve ICU version

function resolveIcuVersion(options: opts.BuildOptions): opts.BuildOptions {
  if (simver.gte(options['agda-version'], '2.6.2')) {
    return {...options, 'icu-version': '71.1'}
  } else if (simver.gte(options['agda-version'], '2.5.3')) {
    // agda >=2.5.3, <2.6.2 depends on text-icu ^0.7, but
    // text-icu <0.7.1.0 fails to compile with icu68+
    return {...options, 'icu-version': '67.1'}
  } else {
    return options
  }
}

// Install ICU

const icu67UrlWindows =
  'https://github.com/unicode-org/icu/releases/download/release-67-1/icu4c-67_1-Win64-MSVC2017.zip'
const icu71UrlWindows =
  'https://github.com/unicode-org/icu/releases/download/release-71-1/icu4c-71_1-Win64-MSVC2019.zip'
const icu67UrlLinux =
  'https://github.com/unicode-org/icu/releases/download/release-67-1/icu4c-67_1-Ubuntu18.04-x64.tgz'
const icu71UrlLinux =
  'https://github.com/unicode-org/icu/releases/download/release-71-1/icu4c-71_1-Ubuntu20.04-x64.tgz'

export async function setup(
  options: opts.BuildOptions
): Promise<opts.BuildOptions> {
  // Resolve the ICU version:
  options = resolveIcuVersion(options)

  // If there is no ICU version to setup, return:
  if (options['icu-version'] === undefined) return options

  // Otherwise, setup ICU:
  switch (opts.os) {
    case 'windows': {
      let icuZipPath = null
      let icuZipName = null
      switch (options['icu-version']) {
        case '67.1': {
          icuZipPath = await tc.downloadTool(icu67UrlWindows)
          icuZipName = 'icu4c-67_1-Win64-MSVC2017'
          break
        }
        case '71.1': {
          icuZipPath = await tc.downloadTool(icu71UrlWindows)
          icuZipName = 'icu4c-71_1-Win64-MSVC2019'
          break
        }
      }
      const installDirTC = await tc.extractZip(
        icuZipPath,
        installDir(options['icu-version'])
      )
      return {
        ...options,
        'extra-lib-dirs': [
          ...options['extra-lib-dirs'],
          path.join(installDirTC, icuZipName, 'bin64')
        ],
        'extra-include-dirs': [
          ...options['extra-include-dirs'],
          path.join(installDirTC, icuZipName, 'include')
        ]
      }
    }
    case 'linux': {
      let icuTarPath = ''
      switch (options['icu-version']) {
        case '67.1': {
          icuTarPath = await tc.downloadTool(icu67UrlLinux)
          break
        }
        case '71.1': {
          icuTarPath = await tc.downloadTool(icu71UrlLinux)
          break
        }
      }
      const installDirTC = await tc.extractTar(
        icuTarPath,
        installDir(options['icu-version']),
        ['--extract', '--gzip', '--strip-components=4']
      )
      return {
        ...options,
        'extra-lib-dirs': [
          ...options['extra-lib-dirs'],
          path.join(installDirTC, 'lib')
        ],
        'extra-include-dirs': [
          ...options['extra-include-dirs'],
          path.join(installDirTC, 'include')
        ]
      }
    }
    case 'macos': {
      switch (options['icu-version']) {
        case '71.1': {
          const brewPrefix = (
            await exec.execOutput('brew', ['--prefix'])
          ).trim()
          await exec.execOutput('brew', ['install', 'icu4c'])
          const installDirBrew = path.join(brewPrefix, 'opt', 'icu4c')
          return {
            ...options,
            'extra-lib-dirs': [
              ...options['extra-lib-dirs'],
              path.join(installDirBrew, 'lib')
            ],
            'extra-include-dirs': [
              ...options['extra-include-dirs'],
              path.join(installDirBrew, 'include')
            ]
          }
        }
      }
    }
  }
  throw Error(`Could not install ICU-${options['icu-version']} for ${opts.os}`)
}
