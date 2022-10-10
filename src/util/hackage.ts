import * as httpm from '@actions/http-client'
import * as core from '@actions/core'
import * as os from 'os'
import * as simver from './simver'
import * as tc from '@actions/tool-cache'
import * as path from 'path'
import * as http from 'http'
import * as opts from '../opts'
import assert from 'assert'

function packageInfoUrl(packageName: string): string {
  return `https://hackage.haskell.org/package/${packageName}.json`
}

function packageUrl(packageName: string, packageVersion: string): string {
  return `https://hackage.haskell.org/package/${packageName}-${packageVersion}/${packageName}-${packageVersion}.tar.gz`
}

export async function getPackageInfo(
  packageName: string,
  options?: Readonly<opts.PackageInfoOptions>
): Promise<opts.PackageInfoCache> {
  const fetchPackageInfo = options?.fetchPackageInfo ?? true
  const returnCacheOnError = options?.returnCacheOnError ?? true
  const packageInfoCache = options?.packageInfoCache
  if (fetchPackageInfo !== true && packageInfoCache === undefined) {
    throw Error(
      'getPackageInfo: if fetchPackageInfo is false, packageInfoCache must be passed'
    )
  } else if (returnCacheOnError !== true && packageInfoCache === undefined) {
    throw Error(
      'getPackageInfo: if returnCacheOnError is false, packageInfoCache must be passed'
    )
  } else if (fetchPackageInfo !== true && packageInfoCache !== undefined) {
    return packageInfoCache
  } else {
    const httpClient = new httpm.HttpClient('setup-agda')
    const headers: http.OutgoingHttpHeaders = options?.packageInfoHeaders ?? {}
    if (packageInfoCache !== undefined) {
      headers['if-modified-since'] = packageInfoCache.lastModified
    }
    const resp = await httpClient.get(packageInfoUrl(packageName), headers)
    core.debug(
      `getPackageInfo: received '${resp.message.statusCode}: ${resp.message.statusMessage}' for package ${packageName}`
    )
    if (resp.message.statusCode === 200) {
      const respBody = await resp.readBody()
      const packageInfo = JSON.parse(respBody) as opts.PackageInfo
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
      const errorMessage = [
        `Could not get package info for ${packageName}:`,
        `${resp.message.statusCode}: ${resp.message.statusMessage}`
      ].join(os.EOL)
      if (returnCacheOnError !== true && packageInfoCache !== undefined) {
        core.warning(errorMessage)
        return packageInfoCache
      } else {
        throw Error(errorMessage)
      }
    }
  }
}

async function getPackageLatestVersion(
  packageName: string,
  options?: Readonly<opts.PackageInfoOptions>
): Promise<string> {
  const updatedPackageInfo = await getPackageInfo(packageName, options)
  const versions = Object.keys(updatedPackageInfo.packageInfo)
    .filter(version => updatedPackageInfo.packageInfo[version] === 'normal')
    .map(simver.parse)
  const maxVersion = simver.max(versions)
  if (maxVersion === null) {
    throw Error(
      `Could not determine latest version from [${versions.join(', ')}]`
    )
  } else {
    return maxVersion
  }
}

async function validatePackageVersion(
  packageName: string,
  packageVersion: string,
  options?: Readonly<opts.PackageInfoOptions>
): Promise<string> {
  const packageInfo = await getPackageInfo(packageName, options)
  const packageVersionStatus = packageInfo.packageInfo[packageVersion]
  if (packageVersionStatus === undefined) {
    throw Error(`Could not find ${packageName} version ${packageVersion}`)
  } else if (packageVersionStatus === 'deprecated') {
    throw Error(`${packageName} version ${packageVersion} is deprecated`)
  } else {
    assert(
      packageVersionStatus === 'normal',
      `Unexpected package version status for ${packageName}-${packageVersion}: ${packageVersionStatus}`
    )
    return packageVersion
  }
}

export async function resolvePackageVersion(
  packageName: string,
  packageVersion: string,
  options?: Readonly<opts.PackageInfoOptions>
): Promise<string> {
  if (packageVersion === 'latest') {
    return await getPackageLatestVersion(packageName, options)
  } else {
    return await validatePackageVersion(packageName, packageVersion, options)
  }
}

export async function getPackageSource(
  packageName: string,
  options?: Readonly<opts.PackageSourceOptions>
): Promise<{packageVersion: string; packageDir: string}> {
  let packageVersion = options?.packageVersion ?? 'latest'
  const validateVersion = options?.validateVersion ?? true
  if (packageVersion === 'latest' || validateVersion) {
    packageVersion = await resolvePackageVersion(
      packageName,
      packageVersion,
      options
    )
  }
  const packageArchive = await tc.downloadTool(
    packageUrl(packageName, packageVersion),
    options?.archivePath,
    options?.downloadAuth,
    options?.downloadHeaders
  )
  let packageDir = await tc.extractTar(
    packageArchive,
    options?.extractToPath,
    options?.tarFlags
  )
  packageDir = path.join(packageDir, `${packageName}-${packageVersion}`)
  return {packageVersion, packageDir}
}
