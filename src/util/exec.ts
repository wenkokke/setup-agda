import * as exec from '@actions/exec'
import * as os from 'node:os'
import * as path from 'node:path'
import * as core from '@actions/core'
import * as io from '@actions/io'
import * as opts from '../opts'
import ensureError from './ensure-error'

export {ExecOptions} from '@actions/exec'
export {findInPath, which} from '@actions/io'

export async function getOutput(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  const {output} = await getOutputAndErrors(prog, args, execOptions)
  return output
}

export async function getOutputAndErrors(
  prog: string,
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<{output: string; errors: string}> {
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
    return {output, errors}
  } else {
    throw Error(
      `The call to ${prog} failed with exit code ${exitCode}:${os.EOL}${errors}`
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
  try {
    return await io.cp(source, dest, options)
  } catch (error) {
    const theError = ensureError(error)
    const truncate = (str: string): string =>
      str.split(os.EOL).slice(undefined, 10).join(os.EOL)
    const sourceDirContents = await lsR(path.dirname(source))
    const destDirContents = await lsR(path.dirname(dest))
    theError.message = [
      theError.message,
      `- sourceDir: ${truncate(sourceDirContents)}`,
      `- destDir: ${truncate(destDirContents)}`,
      `- options: ${JSON.stringify(options)}`
    ].join(os.EOL)
    throw theError
  }
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

export async function rmRF(inputPath: string): Promise<void> {
  inputPath = escape(inputPath)
  core.info(`rm -rf ${inputPath}`)
  return await io.rmRF(inputPath)
}

export async function lsR(inputPath: string): Promise<string> {
  try {
    inputPath = escape(inputPath)
    core.info(`ls -R ${inputPath}`)
    return await getOutput('ls', ['-R', inputPath])
  } catch (error) {
    return ensureError(error).message
  }
}

function escape(filePath: string): string {
  switch (opts.platform) {
    case 'darwin':
    case 'linux':
      return filePath.replace(/(?<!\\) /g, '\\ ')
    case 'win32':
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
