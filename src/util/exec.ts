import * as exec from '@actions/exec'
import * as os from 'os'

export async function execOutput(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  let progOutput = ''
  let progErrors = ''
  execOptions = execOptions ?? {}
  execOptions.listeners = {
    stdout: (data: Buffer) => {
      progOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      progErrors += data.toString()
    }
  }
  const exitCode = await exec.exec(prog, args, execOptions)
  if (exitCode === 0) {
    return progOutput
  } else {
    throw Error(progErrors)
  }
}

export interface VersionOptions extends exec.ExecOptions {
  versionFlag?: string
  parseOutput?: (output: string) => string
}

export async function progVersion(
  prog: string,
  options?: VersionOptions
): Promise<string> {
  const versionFlag = options?.versionFlag ?? '--version'
  const parseOutput = options?.parseOutput ?? (output => output)
  try {
    return parseOutput(await execOutput(prog, [versionFlag], options))
  } catch (error) {
    if (error instanceof Error) {
      error.message = [`Could not get ${prog} version:`, error.message].join(
        os.EOL
      )
    }
    throw error
  }
}
