import * as exec from '../exec.js'
import ensureError from 'ensure-error'
import { ExecOptions } from '../exec.js'

export default async function cabal(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.exec('cabal', args, options)
}

cabal.getVersion = async (): Promise<string> => {
  return exec.getVersion('cabal', {
    versionFlag: '--numeric-version',
    silent: true
  })
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
