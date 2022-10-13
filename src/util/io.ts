import * as core from '@actions/core'
import * as io from '@actions/io'
import * as opts from '../opts'

// Wrappers for filesystem functions

export {CopyOptions, MoveOptions} from '@actions/io'

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

export async function cp(
  source: string,
  dest: string,
  options?: io.CopyOptions
): Promise<void> {
  source = escape(source)
  dest = escape(dest)
  core.debug(`cp ${source} ${dest}`)
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
  core.debug(`mv ${source} ${dest}`)
  return await io.mv(source, dest, options)
}

export async function mkdirP(dir: string): Promise<void> {
  dir = escape(dir)
  core.debug(`mkdir -p ${dir}`)
  return await io.mkdirP(dir)
}

export async function rmRF(path: string): Promise<void> {
  path = escape(path)
  core.debug(`rm -rf ${path}`)
  return await io.rmRF(path)
}
