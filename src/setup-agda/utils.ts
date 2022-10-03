import * as exec from '@actions/exec'
import * as os from 'os'

export async function agdaVersion(): Promise<string> {
  let agdaVersionOutput = ''
  let agdaVersionErrors = ''
  const options: exec.ExecOptions = {}
  options.listeners = {
    stdout: (data: Buffer) => {
      agdaVersionOutput += data.toString()
    },
    stderr: (data: Buffer) => {
      agdaVersionErrors += data.toString()
    }
  }
  const exitCode = await exec.exec('agda', ['--version'], options)
  if (exitCode === 0) {
    if (agdaVersionOutput.startsWith('Agda version ')) {
      return agdaVersionOutput.substring('Agda version '.length)
    } else {
      throw Error(`Could not parse Agda version: '${agdaVersionOutput}'`)
    }
  } else {
    throw Error(
      `Call to 'agda --version' failed with:${os.EOL}${agdaVersionErrors}'`
    )
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
    throw Error(
      `Call to 'agda ${args.join(' ')}' failed with:${os.EOL}${agdaErrors}`
    )
  }
}
