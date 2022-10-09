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
  return await io.cp(escape(source), escape(dest), options)
}

export async function mv(
  source: string,
  dest: string,
  options?: io.MoveOptions
): Promise<void> {
  return await io.mv(escape(source), escape(dest), options)
}

export async function mkdirP(fsPath: string): Promise<void> {
  return await io.mkdirP(escape(fsPath))
}

export async function rmRF(inputPath: string): Promise<void> {
  return await io.rmRF(escape(inputPath))
}
