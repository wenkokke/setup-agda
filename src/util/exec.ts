import * as exec from '@actions/exec'

// Helpers for system calls

export * from '@actions/exec'

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

// Helpers for getting versions

export interface VersionOptions extends exec.ExecOptions {
  versionFlag?: string
  parseOutput?: (output: string) => string
}

export async function getVersion(
  prog: string,
  options?: VersionOptions
): Promise<string> {
  const versionFlag = options?.versionFlag ?? '--version'
  const output = await execOutput(prog, [versionFlag], options)
  return options?.parseOutput !== undefined
    ? options?.parseOutput(output)
    : output
}
