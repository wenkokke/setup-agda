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

export async function progVersion(
  prog: string,
  versionFlag?: string,
  parseOutput?: (output: string) => string,
  execOptions?: Omit<exec.ExecOptions, 'stdout'>
): Promise<string> {
  versionFlag = versionFlag ?? '--version'
  try {
    const output = await execOutput(prog, [versionFlag], execOptions)
    return parseOutput !== undefined ? parseOutput(output) : output
  } catch (error) {
    throw error instanceof Error
      ? Error([`Could not get ${prog} version:`, error.message].join(os.EOL))
      : error
  }
}
