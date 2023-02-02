import * as exec from '@actions/exec'
import * as os from 'node:os'

export { ExecOptions } from '@actions/exec'
export { default as which } from 'which'

export async function getOutput(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  const { output } = await getOutputAndErrors(prog, args, execOptions)
  return output
}

export async function getOutputAndErrors(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<{ output: string; errors: string }> {
  let output = ''
  let errors = ''
  execOptions = execOptions ?? {}
  execOptions.ignoreReturnCode = true
  execOptions.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    },
    stderr: (data: Buffer) => {
      errors += data.toString()
    }
  }
  output = output.trim()
  errors = errors.trim()
  const exitCode = await exec.exec(prog, args, execOptions)
  if (exitCode === 0) {
    return { output, errors }
  } else {
    throw Error(
      `The call to ${prog} failed with exit code ${exitCode}:${os.EOL}${errors}`
    )
  }
}

// Helper for getting the version number from an executable

export interface VersionOptions extends exec.ExecOptions {
  versionFlag?: string
  parseOutput?: (progOutput: string) => string
}

export async function getVersion(
  prog: string,
  options?: VersionOptions
): Promise<string> {
  const versionFlag = options?.versionFlag ?? '--version'
  let progOutput = await getOutput(prog, [versionFlag], options)
  progOutput = progOutput.trim()
  return options?.parseOutput !== undefined
    ? options?.parseOutput(progOutput)
    : progOutput
}
