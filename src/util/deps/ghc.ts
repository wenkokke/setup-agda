import * as exec from '../exec.js'
import ensureError from 'ensure-error'
import { ExecOptions } from '../exec.js'

export default async function ghc(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.getOutput('ghc', args, options)
}

ghc.getInfo = async (
  options?: ExecOptions
): Promise<Partial<Record<string, string>>> => {
  let ghcInfoString = await ghc(['--info'], options)
  ghcInfoString = ghcInfoString.replace(/\(/g, '[').replace(/\)/g, ']')
  const ghcInfo = JSON.parse(ghcInfoString) as [string, string][]
  return Object.fromEntries(
    ghcInfo.map((entry) => [
      // "Target platform" -> 'ghc-info-target-platform'
      `ghc-info-${entry[0].toLowerCase().replace(/ /g, '-')}`,
      entry[1]
    ])
  )
}

ghc.getVersion = async (): Promise<string> => {
  return exec.getVersion('ghc', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

ghc.maybeGetVersion = async (): Promise<string | null> => {
  try {
    return await ghc.getVersion()
  } catch (error) {
    logger.info(
      `Could not get installed GHC version: ${ensureError(error).message}`
    )
    return null
  }
}
