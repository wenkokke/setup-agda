import * as exec from '@actions/exec'

export async function agdaVersion(): Promise<string> {
  let output = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    }
  }
  exec.exec('agda', ['--version'], options)
  if (output.startsWith('Agda version ')) {
    return output.substring('Agda version '.length)
  } else {
    throw Error(`Could not parse Agda version: '${output}'`)
  }
}

export async function agdaDataDir(): Promise<string> {
  let output = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      output += data.toString()
    }
  }
  exec.exec('agda', ['--print-agda-dir'], options)
  return output
}

export async function agdaCompile(args: string[]): Promise<string> {
  let agdaOutput = ''
  let agdaErrors = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      agdaOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      agdaErrors += data.toString()
    }
  }
  const exitCode = await exec.exec('agda', args)
  if (exitCode === 0) {
    return agdaOutput
  } else {
    throw Error(`Call to 'agda ${args.join(' ')}' failed with:\n${agdaErrors}`)
  }
}
