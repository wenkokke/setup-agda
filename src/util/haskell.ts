import * as exec from './exec'

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
  return await exec.getoutput('ghc', args, execOptions)
}

export async function cabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getoutput('cabal', args, execOptions)
}

export async function stack(
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

export async function cabalGetVersion(using?: {
  'enable-stack': boolean
  'ghc-version': string
  'stack-no-global': boolean
}): Promise<string> {
  if (
    using !== undefined &&
    using['enable-stack'] &&
    using['stack-no-global']
  ) {
    const output = await stack(
      [
        'exec',
        'cabal',
        `--compiler=ghc-${using['ghc-version']}`,
        '--',
        '--numeric-version'
      ],
      {silent: true}
    )
    return output.trim()
  } else {
    return exec.getVersion('cabal', {
      versionFlag: '--numeric-version',
      silent: true
    })
  }
}

export async function stackGetVersion(): Promise<string> {
  return exec.getVersion('stack', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function stackGetLocalBin(using: {
  'ghc-version': string
}): Promise<string> {
  const stackLocalBin = await stack([
    `--compiler=ghc-${using['ghc-version']}`,
    '--system-ghc',
    '--no-install-ghc',
    'path',
    '--local-bin'
  ])
  return stackLocalBin.trim()
}
