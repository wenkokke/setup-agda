import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as os from 'os'
import * as process from 'process'
import appDirs from 'appdirsjs'

export type Platform = 'linux' | 'darwin' | 'win32'

const agdaDirs = appDirs({appName: 'agda'})

export const cacheDir: string = agdaDirs.cache

export const installDir: string = agdaDirs.data

export async function agdaVersion(): Promise<string> {
  const agdaVersionOutput = await agda(['--version'])
  if (agdaVersionOutput.startsWith('Agda version ')) {
    return agdaVersionOutput.substring('Agda version '.length).trim()
  } else {
    throw Error(`Could not parse Agda version: '${agdaVersionOutput}'`)
  }
}

export async function agdaDataDir(): Promise<string> {
  return (await agda(['--print-agda-dir'])).trim()
}

function agdaName(): string {
  const platform = process.platform as Platform
  switch (platform) {
    case 'win32':
      return 'agda.exe'
    default:
      return 'agda'
  }
}

export async function agda(
  args: string[],
  options?: exec.ExecOptions
): Promise<string> {
  let agdaOutput = ''
  let agdaErrors = ''
  options = options ?? {}
  options.listeners = {
    stdout: (data: Buffer) => {
      agdaOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      agdaErrors += data.toString()
    }
  }
  const exitCode = await exec.exec(agdaName(), args, options)
  if (exitCode === 0) {
    return agdaOutput
  } else {
    throw Error(
      [`Call to 'agda ${args.join(' ')}' failed with:`, agdaErrors].join(os.EOL)
    )
  }
}
export async function agdaTest(): Promise<void> {
  const pathToAgda = await io.which(agdaName(), true)
  core.info(`Found Agda on PATH at ${pathToAgda}`)
  const versionString = await agdaVersion()
  core.info(`Found Agda version ${versionString}`)
  const dataDir = await agdaDataDir()
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    core.toPlatformPath(`${dataDir}/lib/prim/**/*.agda`)
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compile ${agdaFile}`)
    await agda(['-v2', agdaFile])
  }
}

export async function lsR(dir: string): Promise<string> {
  let commandOutput = ''
  let commandErrors = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      commandOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      commandErrors += data.toString()
    }
  }
  const exitCode = await exec.exec('ls', ['-R', dir], options)
  if (exitCode === 0) {
    return commandOutput
  } else {
    throw Error(
      [`Call to 'ls -R ${dir} failed with:`, commandErrors].join(os.EOL)
    )
  }
}
