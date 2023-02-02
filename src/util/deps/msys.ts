import { ExecOptions } from '../exec.js'
import { platform } from '../platform.js'

const pathSep = platform === 'windows' ? ';' : ':'

function joinPath(dirs: string[]): string {
  return dirs.join(pathSep)
}

function splitPath(PATH?: string): string[] {
  return (
    PATH?.split(pathSep)
      ?.map((dir) => dir.trim())
      ?.filter((dir) => dir !== '') ?? []
  )
}

const msysPaths = ['C:\\msys64\\mingw64\\bin', 'C:\\msys64\\usr\\bin']

export default {
  paths: msysPaths,
  path: joinPath(msysPaths),
  modifyExecOptions: (options?: ExecOptions): ExecOptions => {
    if (platform === 'windows') {
      if (options === undefined) {
        options = {}
      }
      if (options.env === undefined) {
        options.env = {}
      }
      const pathDirs = splitPath(options.env.PATH)
      options.env.PATH = joinPath([...pathDirs, ...msysPaths])
      return options
    } else {
      return options ?? {}
    }
  }
}
