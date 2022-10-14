import * as exec from './exec'

export async function getGhcInfo(
  execOptions?: exec.ExecOptions
): Promise<Partial<Record<string, string>>> {
  let ghcInfoString = await execSystemGhc(['--info'], execOptions)
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

export async function execSystemGhc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getoutput('ghc', args, execOptions)
}

export async function execSystemCabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getoutput('cabal', args, execOptions)
}

export async function execSystemStack(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getoutput('stack', args, execOptions)
}

export async function ghcGetVersion(): Promise<string> {
  return exec.getVersion('ghc', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function cabalGetVersion(): Promise<string> {
  return exec.getVersion('cabal', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function getStackCabalVersionForGhc(
  ghcVersion: string
): Promise<string> {
  return await execSystemStack(
    [
      'exec',
      'cabal',
      `--compiler=ghc-${ghcVersion}`,
      '--',
      '--numeric-version'
    ],
    {silent: true}
  )
}

export async function getSystemStackVersion(): Promise<string> {
  return exec.getVersion('stack', {
    versionFlag: '--numeric-version',
    silent: true
  })
}
