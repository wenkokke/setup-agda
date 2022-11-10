import * as core from '@actions/core'
import * as exec from './exec'
import ensureError from './ensure-error'

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

export async function stack(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.getOutput('stack', args, execOptions)
}

export async function ghcGetVersion(using?: {
  'enable-stack': boolean
  'stack-no-global': boolean
}): Promise<string> {
  if (
    using !== undefined &&
    using['enable-stack'] &&
    using['stack-no-global']
  ) {
    const output = await stack(['exec', 'ghc', '--', '--numeric-version'], {
      silent: true
    })
    return output.trim()
  } else {
    return exec.getVersion('ghc', {
      versionFlag: '--numeric-version',
      silent: true
    })
  }
}

export async function ghcMaybeGetVersion(using?: {
  'enable-stack': boolean
  'stack-no-global': boolean
}): Promise<string | null> {
  try {
    return await ghcGetVersion(using)
  } catch (error) {
    core.info(
      `Could not get installed GHC version: ${ensureError(error).message}`
    )
    return null
  }
}

export async function cabalGetVersion(using?: {
  'enable-stack': boolean
  'stack-no-global': boolean
}): Promise<string> {
  if (
    using !== undefined &&
    using['enable-stack'] &&
    using['stack-no-global']
  ) {
    const output = await stack(['exec', 'cabal', '--', '--numeric-version'], {
      silent: true
    })
    return output.trim()
  } else {
    return exec.getVersion('cabal', {
      versionFlag: '--numeric-version',
      silent: true
    })
  }
}

export async function cabalMaybeGetVersion(using?: {
  'enable-stack': boolean
  'stack-no-global': boolean
}): Promise<string | null> {
  try {
    return await cabalGetVersion(using)
  } catch (error) {
    core.info(
      `Could not get installed Cabal version: ${ensureError(error).message}`
    )
    return null
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
