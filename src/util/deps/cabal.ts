import ensureError from 'ensure-error'
import exec, { ExecOptions } from '../exec.js'

export default async function cabal(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('cabal', args, options)
}

cabal.getVersion = async (): Promise<string> => {
  return await exec('cabal', ['--numeric-version'])
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
