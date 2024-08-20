import ensureError from 'ensure-error'
import exec, { ExecOptions } from '../exec.js'

export type CabalVerbosity = 0 | 1 | 2 | 3

export default async function cabal(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('cabal', args, options)
}

const verbosityToLevel = {
  debug: 2,
  error: 0,
  fatal: 0,
  info: 1,
  silent: 0,
  trace: 3,
  warning: 0
}

const defaultVerbosity = verbosityToLevel.info

cabal.getVerbosityFlag = (verbosity?: Verbosity): string => {
  const level =
    verbosity === undefined
      ? defaultVerbosity
      : verbosityToLevel?.[verbosity] ?? defaultVerbosity
  return `--verbose=${level}`
}

cabal.getVersion = async (): Promise<string> => {
  const { stdout } = await exec('cabal', ['--numeric-version'])
  return stdout
}

cabal.maybeGetVersion = async (): Promise<string | null> => {
  try {
    return await cabal.getVersion()
  } catch (error) {
    logger.info(
      `Could not get installed Cabal version: ${ensureError(error).message}`
    )
    return null
  }
}
