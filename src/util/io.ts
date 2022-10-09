import * as io from '@actions/io'

// Wrappers for filesystem functions

export {CopyOptions, MoveOptions} from '@actions/io'

export async function cp(
  source: string,
  dest: string,
  options?: io.CopyOptions
): Promise<void> {
  return await io.cp(`'${source}'`, `'${dest}'`, options)
}

export async function mv(
  source: string,
  dest: string,
  options?: io.MoveOptions
): Promise<void> {
  return await io.mv(`'${source}'`, `'${dest}'`, options)
}

export async function mkdirP(fsPath: string): Promise<void> {
  return await io.mkdirP(`'${fsPath}'`)
}

export async function rmRF(inputPath: string): Promise<void> {
  return await io.rmRF(`'${inputPath}'`)
}
