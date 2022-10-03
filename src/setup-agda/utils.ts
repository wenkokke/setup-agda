import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as glob from '@actions/glob'
import * as io from '@actions/io'
import * as os from 'os'

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
  const exitCode = await exec.exec('agda', args, options)
  if (exitCode === 0) {
    return agdaOutput
  } else {
    throw Error(
      `Call to 'agda ${args.join(' ')}' failed with:${os.EOL}${agdaErrors}`
    )
  }
}
export async function agdaTest(): Promise<void> {
  core.info('Test Agda installation:')
  const pathToAgda = await io.which('agda')
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
