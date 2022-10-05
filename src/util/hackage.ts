import * as httpm from '@actions/http-client'
import * as os from 'os'
import * as simver from './simple-version'
import * as tc from '@actions/tool-cache'

type PackageStatus = 'normal' | 'deprecated'

type PackageInfo = Record<string, PackageStatus>

async function getPackageInfo(packageName: string): Promise<PackageInfo> {
  const http = new httpm.HttpClient('setup-agda')
  const resp = await http.get(
    `https://hackage.haskell.org/package/${packageName}.json`
  )
  if (resp.message.statusCode !== 200) {
    throw Error(
      [
        `Could not get package info for ${packageName}:`,
        `${resp.message.statusCode}: ${resp.message.statusMessage}`
      ].join(os.EOL)
    )
  } else {
    const respBody = await resp.readBody()
    return JSON.parse(respBody) as PackageInfo
  }
}

async function getPackageSimpleVersions(
  packageName: string
): Promise<simver.SimVer[]> {
  const packageInfo = await getPackageInfo(packageName)
  return Object.keys(packageInfo)
    .filter(version => packageInfo[version] === 'normal')
    .map(simver.parse)
}

export async function getPackageVersions(
  packageName: string
): Promise<string[]> {
  const versions = await getPackageSimpleVersions(packageName)
  return versions.map(simver.toString)
}

async function getLatestSimpleVersion(
  packageName: string
): Promise<simver.SimVer | null> {
  const versions = await getPackageSimpleVersions(packageName)
  return simver.max(versions)
}

export async function getLatestVersion(
  packageName: string
): Promise<string | null> {
  const latestSimVer = await getLatestSimpleVersion(packageName)
  return latestSimVer !== null ? simver.toString(latestSimVer) : null
}

export async function getPackageSource(
  packageName: string,
  packageVersion?: string,
  dest?: string,
  flags?: string[]
): Promise<string> {
  if (packageVersion === undefined || packageVersion === 'latest') {
    const latestVersion = await getLatestVersion(packageName)
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
