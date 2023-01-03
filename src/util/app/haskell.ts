import * as logging from '../logging'
import * as exec from '../exec'
import ensureError from '../ensure-error'

export async function getGhcInfo(
  execOptions?: exec.ExecOptions
): Promise<Partial<Record<string, string>>> {
  let ghcInfoString = await ghc(['--info'], execOptions)
  ghcInfoString = ghcInfoString.replace(/\(/g, '[').replace(/\)/g, ']')
  const ghcInfo = JSON.parse(ghcInfoString) as [string, string][]
  return Object.fromEntries(
    ghcInfo.map(entry => [
      // "Target platform" -> 'ghc-info-target-platform'
      `ghc-info-${entry[0].toLowerCase().replace(/ /g, '-')}`,
      entry[1]
    ])
  )
}

export async function ghc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getOutput('ghc', args, execOptions)
}

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getOutput('cabal', args, execOptions)
}

export async function ghcGetVersion(): Promise<string> {
  return exec.getVersion('ghc', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function ghcMaybeGetVersion(): Promise<string | null> {
  try {
    return await ghcGetVersion()
  } catch (error) {
    logging.info(
      `Could not get installed GHC version: ${ensureError(error).message}`
    )
    return null
  }
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
