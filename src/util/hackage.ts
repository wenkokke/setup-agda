import * as httpm from '@actions/http-client'
import * as os from 'os'
import * as simver from './simver'
import * as tc from '@actions/tool-cache'
import * as path from 'path'
import {OutgoingHttpHeaders} from 'http'

export type PackageStatus = 'normal' | 'deprecated'

export type PackageInfo = Record<string, PackageStatus | undefined>

export interface PackageInfoCache {
  packageInfo: PackageInfo
  lastModified: string
}

function packageInfoUrl(packageName: string): string {
  return `https://hackage.haskell.org/package/${packageName}.json`
}

function packageUrl(packageName: string, packageVersion: string): string {
  return `https://hackage.haskell.org/package/${packageName}-${packageVersion}/${packageName}-${packageVersion}.tar.gz`
}

export async function getPackageInfo(
  packageName: string,
  packageInfoCache?: PackageInfoCache
): Promise<PackageInfoCache> {
  const http = new httpm.HttpClient('setup-agda')
  const additionalHeaders: OutgoingHttpHeaders = {}
  if (packageInfoCache !== undefined) {
    additionalHeaders['if-modified-since'] = packageInfoCache.lastModified
  }
  const resp = await http.get(packageInfoUrl(packageName), additionalHeaders)
  if (resp.message.statusCode === 200) {
    const respBody = await resp.readBody()
    const packageInfo = JSON.parse(respBody) as PackageInfo
    return {
      packageInfo,
      lastModified: new Date(Date.now()).toUTCString()
    }
  } else if (
    packageInfoCache?.packageInfo !== undefined &&
    resp.message.statusCode === 304
  ) {
    return packageInfoCache
  } else {
    throw Error(
      [
        `Could not get package info for ${packageName}:`,
        `${resp.message.statusCode}: ${resp.message.statusMessage}`
      ].join(os.EOL)
    )
  }
}

async function getPackageSimVers(
  packageName: string,
  packageInfoCache?: PackageInfoCache
): Promise<simver.SimVer[]> {
  const updatedPackageInfo = await getPackageInfo(packageName, packageInfoCache)
  return Object.keys(updatedPackageInfo.packageInfo)
    .filter(version => updatedPackageInfo.packageInfo[version] === 'normal')
    .map(simver.parse)
}

async function getPackageLatestSimVer(
  packageName: string,
  packageInfoCache?: PackageInfoCache
): Promise<simver.SimVer | null> {
  const versions = await getPackageSimVers(packageName, packageInfoCache)
  return simver.max(versions)
}

export async function getPackageVersions(
  packageName: string,
  packageInfoCache?: PackageInfoCache
): Promise<string[]> {
  const versions = await getPackageSimVers(packageName, packageInfoCache)
  return versions.map(simver.toString)
}

export async function getPackageLatestVersion(
  packageName: string,
  packageInfoCache?: PackageInfoCache
): Promise<string | null> {
  const latestSimVer = await getPackageLatestSimVer(
    packageName,
    packageInfoCache
  )
  return latestSimVer !== null ? simver.toString(latestSimVer) : null
}

export async function getPackageSource(
  packageName: string,
  packageVersion?: string,
  dest?: string,
  flags?: string[],
  packageInfoCache?: PackageInfoCache
): Promise<string> {
  if (packageVersion === undefined || packageVersion === 'latest') {
    const latestVersion = await getPackageLatestVersion(
      packageName,
      packageInfoCache
    )
    if (latestVersion === null) {
      throw Error(`Could not determine latest version of ${packageName}`)
    } else {
      packageVersion = latestVersion
    }
  }
  const packageSourceArchive = await tc.downloadTool(
    packageUrl(packageName, packageVersion)
  )
  const packageSourceDir = await tc.extractTar(
    packageSourceArchive,
    dest,
    flags
  )
  return path.join(packageSourceDir, `${packageName}-${packageVersion}`)
}
