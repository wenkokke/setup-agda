import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as os from 'os'
import {platform} from './config'
import {execOutput} from './exec'

export async function getAgdaVersion(): Promise<string> {
  const agdaVersionOutput = await agda(['--version'])
  if (agdaVersionOutput.startsWith('Agda version ')) {
    return agdaVersionOutput.substring('Agda version '.length).trim()
  } else {
    throw Error(`Could not parse Agda version: '${agdaVersionOutput}'`)
  }
}

export async function getAgdaDataDir(): Promise<string> {
  return (await agda(['--print-agda-dir'])).trim()
}

function getAgdaName(): string {
  switch (platform) {
    case 'win32':
      return 'agda.exe'
    default:
      return 'agda'
  }
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
  const pathToAgda = await io.which(getAgdaName(), true)
  core.info(`Found Agda on PATH at ${pathToAgda}`)
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
