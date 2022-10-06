import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as os from 'os'
import {execOutput, getVersion} from './exec'
import * as hackage from './hackage'
import agdaPackageInfoCache from '../package-info/Agda.json'

export async function getPackageInfo(): Promise<hackage.PackageInfoCache> {
  return await hackage.getPackageInfo(
    'Agda',
    agdaPackageInfoCache as hackage.PackageInfoCache
  )
}

export async function getVersions(): Promise<string[]> {
  return await hackage.getPackageVersions(
    'Agda',
    agdaPackageInfoCache as hackage.PackageInfoCache
  )
}

export async function getLatestVersion(): Promise<string | null> {
  return await hackage.getPackageLatestVersion(
    'Agda',
    agdaPackageInfoCache as hackage.PackageInfoCache
  )
}

export async function getSystemAgdaVersion(): Promise<string> {
  return await getVersion('agda', {
    parseOutput: output => {
      if (output.startsWith('Agda version ')) {
        return output.substring('Agda version '.length).trim()
      } else {
        throw Error(`Could not parse Agda version: '${output}'`)
      }
    },
    silent: true
  })
}

export async function getSystemAgdaDataDir(): Promise<string> {
  return (await execSystemAgda(['--print-agda-dir'])).trim()
}

export async function execSystemAgda(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  try {
    return await execOutput('agda', args, execOptions)
  } catch (error) {
    throw error instanceof Error
      ? Error([`Call to Agda failed with:`, error.message].join(os.EOL))
      : error
  }
}

export async function testSystemAgda(): Promise<void> {
  const versionString = await getSystemAgdaVersion()
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await getSystemAgdaDataDir()
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    core.toPlatformPath(`${dataDir}/lib/prim/**/*.agda`)
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compile ${agdaFile}`)
    await execSystemAgda(['-v2', agdaFile])
  }
}
