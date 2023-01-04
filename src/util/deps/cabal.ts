import * as logging from '../logging'
import * as exec from '../exec'
import ensureError from '../ensure-error'

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getOutput('cabal', args, execOptions)
}

export async function cabalGetVersion(): Promise<string> {
  return exec.getVersion('cabal', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function cabalMaybeGetVersion(): Promise<string | null> {
  try {
    return await cabalGetVersion()
  } catch (error) {
    logging.info(
      `Could not get installed Cabal version: ${ensureError(error).message}`
    )
    return null
  }
}
