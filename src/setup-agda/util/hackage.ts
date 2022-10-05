import * as httpm from '@actions/http-client'
import * as os from 'os'
import * as simver from './simple-version'
import * as tc from '@actions/tool-cache'
import {OutgoingHttpHeaders} from 'http'

export type PackageStatus = 'normal' | 'deprecated'

export type PackageInfo = Record<string, PackageStatus>

export interface PackageInfoCache {
  packageInfo: PackageInfo
  lastModified: Date
}

async function getPackageInfo(
  packageName: string,
  cache?: PackageInfoCache
): Promise<PackageInfo> {
  const http = new httpm.HttpClient('setup-agda')
  const additionalHeaders: OutgoingHttpHeaders = {}
  if (cache !== undefined) {
    additionalHeaders['if-modified-since'] = cache.lastModified.toUTCString()
  }
  const resp = await http.get(
    `https://hackage.haskell.org/package/${packageName}.json`,
    additionalHeaders
  )
  if (resp.message.statusCode === 200) {
    const respBody = await resp.readBody()
    return JSON.parse(respBody) as PackageInfo
  } else if (
    cache?.packageInfo !== undefined &&
    resp.message.statusCode === 304
  ) {
    return cache?.packageInfo
  } else {
    throw Error(
      [
        `Could not get package info for ${packageName}:`,
        `${resp.message.statusCode}: ${resp.message.statusMessage}`
      ].join(os.EOL)
    )
  }
}

async function getPackageSimpleVersions(
  packageName: string,
  cache?: PackageInfoCache
): Promise<simver.SimVer[]> {
  const packageInfo = await getPackageInfo(packageName, cache)
  return Object.keys(packageInfo)
    .filter(version => packageInfo[version] === 'normal')
    .map(simver.parse)
}

export async function getPackageVersions(
  packageName: string,
  cache?: PackageInfoCache
): Promise<string[]> {
  const versions = await getPackageSimpleVersions(packageName, cache)
  return versions.map(simver.toString)
}

async function getLatestSimpleVersion(
  packageName: string,
  cache?: PackageInfoCache
): Promise<simver.SimVer | null> {
  const versions = await getPackageSimpleVersions(packageName, cache)
  return simver.max(versions)
}

export async function getLatestVersion(
  packageName: string,
  cache?: PackageInfoCache
): Promise<string | null> {
  const latestSimVer = await getLatestSimpleVersion(packageName, cache)
  return latestSimVer !== null ? simver.toString(latestSimVer) : null
}

export async function getPackageSource(
  packageName: string,
  packageVersion?: string,
  dest?: string,
  flags?: string[],
  cache?: PackageInfoCache
): Promise<string> {
  if (packageVersion === undefined || packageVersion === 'latest') {
    const latestVersion = await getLatestVersion(packageName, cache)
    if (latestVersion === null) {
      throw Error(`Could not determine latest version of ${packageName}`)
    } else {
      packageVersion = latestVersion
    }
  }
  const packageUrl = `https://hackage.haskell.org/package/${packageName}-${packageVersion}/${packageName}-${packageVersion}.tar.gz`
  const packagePath = await tc.downloadTool(packageUrl)
  return tc.extractTar(packagePath, dest, flags)
}
