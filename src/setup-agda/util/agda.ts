import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import {execOutput, progVersion} from './exec'
import {PackageInfoCache} from './hackage'

export async function getAgdaPackageInfoCache(): Promise<PackageInfoCache> {
  const packageInfoPath = path.join(__dirname, 'Agda.json')
  const packageInfo = JSON.parse(fs.readFileSync(packageInfoPath, 'utf8'))
  const {mtime} = fs.statSync(packageInfoPath)
  return {packageInfo, lastModified: mtime} as PackageInfoCache
}

export async function getAgdaVersion(): Promise<string> {
  return await progVersion('agda', {
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

export async function getAgdaDataDir(): Promise<string> {
  return (await agda(['--print-agda-dir'])).trim()
}

export async function agda(
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

export async function agdaTest(): Promise<void> {
  const versionString = await getAgdaVersion()
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await getAgdaDataDir()
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    core.toPlatformPath(`${dataDir}/lib/prim/**/*.agda`)
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compile ${agdaFile}`)
    await agda(['-v2', agdaFile])
  }
}
