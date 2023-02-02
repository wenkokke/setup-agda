import ensureError from 'ensure-error'
import exec, { ExecOptions } from '../exec.js'

export default async function ghc(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('ghc', args, options)
}

ghc.getInfo = async (
  options?: ExecOptions
): Promise<Partial<Record<string, string>>> => {
  const { stdout } = await exec('ghc', ['--info'], options)
  const ghcInfo = JSON.parse(
    stdout.replace(/\(/g, '[').replace(/\)/g, ']')
  ) as [string, string][]
  return Object.fromEntries(
    ghcInfo.map((entry) => [
      // "Target platform" -> 'ghc-info-target-platform'
      `ghc-info-${entry[0].toLowerCase().replace(/ /g, '-')}`,
      entry[1]
    ])
  )
}

ghc.getVersion = async (): Promise<string> => {
  const { stdout } = await exec('ghc', ['--numeric-version'])
  return stdout
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
