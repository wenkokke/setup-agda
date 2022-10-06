import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'os'
import * as exec from './exec'
import * as hackage from './hackage'
import packageInfoCache from '../package-info/Agda.json'
import assert from 'assert'

export {
  PackageInfoCache,
  PackageInfoOptions,
  PackageSourceOptions
} from './hackage'

const packageName = 'Agda'
const oldPackageInfoCache = packageInfoCache as hackage.PackageInfoCache

export async function getPackageSource(
  options?: hackage.PackageSourceOptions
): Promise<{packageVersion: string; packageDir: string}> {
  return await hackage.getPackageSource(
    packageName,
    Object.assign({packageInfoCache: oldPackageInfoCache}, options)
  )
}

export async function getPackageInfo(
  options?: Readonly<hackage.PackageInfoOptions>
): Promise<hackage.PackageInfoCache> {
  return await hackage.getPackageInfo(
    packageName,
    Object.assign({packageInfoCache: oldPackageInfoCache}, options)
  )
}

export async function resolvePackageVersion(
  packageVersion: string,
  options?: Readonly<hackage.PackageInfoOptions>
): Promise<string> {
  assert(packageVersion !== 'nightly', "resolveVersion: got 'nightly'")
  return await hackage.resolvePackageVersion(
    packageName,
    packageVersion,
    Object.assign({packageInfoCache: oldPackageInfoCache}, options)
  )
}

export async function getSystemAgdaVersion(): Promise<string> {
  return await exec.getVersion('agda', {
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
    return await exec.execOutput('agda', args, execOptions)
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
