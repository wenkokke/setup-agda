import * as exec from '@actions/exec'
import * as os from 'node:os'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as opts from '../opts'

export {ExecOptions} from '@actions/exec'
export {findInPath, which} from '@actions/io'

export async function getOutput(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  let progOutput = ''
  let progErrors = ''
  execOptions = execOptions ?? {}
  execOptions.ignoreReturnCode = true
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
    return progOutput.trim()
  } else {
    throw Error(
      `The call to ${prog} failed with exit code ${exitCode}:${os.EOL}${progErrors}`
    )
  }
}

// Wrappers for filesystem functions

export {CopyOptions, MoveOptions} from '@actions/io'

export async function cp(
  source: string,
  dest: string,
  options?: io.CopyOptions
): Promise<void> {
  source = escape(source)
  dest = escape(dest)
  core.info(`cp ${source} ${dest}`)
  return await io.cp(source, dest, options)
}

export async function cpR(
  source: string,
  dest: string,
  options?: io.CopyOptions
): Promise<void> {
  return await cp(source, dest, {
    ...options,
    recursive: true
  })
}

export async function mv(
  source: string,
  dest: string,
  options?: io.MoveOptions
): Promise<void> {
  source = escape(source)
  dest = escape(dest)
  core.info(`mv ${source} ${dest}`)
  return await io.mv(source, dest, options)
}

export async function mkdirP(dir: string): Promise<void> {
  dir = escape(dir)
  core.info(`mkdir -p ${dir}`)
  return await io.mkdirP(dir)
}

export async function rmRF(path: string): Promise<void> {
  path = escape(path)
  core.info(`rm -rf ${path}`)
  return await io.rmRF(path)
}

export async function lsR(path: string): Promise<string> {
  path = escape(path)
  core.info(`ls -R ${path}`)
  return await getOutput('ls', ['-R', path])
}

function escape(filePath: string): string {
  switch (opts.os) {
    case 'macos':
    case 'linux':
      return filePath.replace(/(?<!\\) /g, '\\ ')
    case 'windows':
    default:
      return filePath
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
