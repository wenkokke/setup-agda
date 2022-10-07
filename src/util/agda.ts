import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'os'
import * as exec from './exec'
import * as hackage from './hackage'
import distPackageInfoCache from '../package-info/Agda.json'

export {PackageInfoCache} from './hackage'

export const packageInfoCache = distPackageInfoCache as hackage.PackageInfoCache

export interface AgdaExecOptions extends exec.ExecOptions {
  systemAgda?: string
  systemAgdaDataDir?: string
}

export async function getSystemAgdaVersion(
  options?: AgdaExecOptions
): Promise<string> {
  const systemAgdaPath = options?.systemAgda ?? 'agda'
  return await exec.getVersion(systemAgdaPath, {
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

export async function getSystemAgdaDataDir(
  options?: AgdaExecOptions
): Promise<string> {
  if (options?.systemAgdaDataDir !== undefined) {
    return options?.systemAgdaDataDir
  } else {
    return await execSystemAgda(['--print-agda-dir'], options)
  }
}

export async function execSystemAgda(
  args: string[],
  options?: AgdaExecOptions
): Promise<string> {
  try {
    const systemAgdaPath = options?.systemAgda ?? 'agda'
    return await exec.execOutput(systemAgdaPath, args, options)
  } catch (error) {
    throw error instanceof Error
      ? Error([`Call to Agda failed with:`, error.message].join(os.EOL))
      : error
  }
}

export async function testSystemAgda(options?: AgdaExecOptions): Promise<void> {
  const versionString = await getSystemAgdaVersion(options)
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await getSystemAgdaDataDir(options)
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    core.toPlatformPath(`${dataDir}/lib/prim/**/*.agda`)
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compile ${agdaFile}`)
    await execSystemAgda(['-v2', agdaFile], options)
  }
}
