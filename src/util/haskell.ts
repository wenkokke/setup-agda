import * as core from '@actions/core'
import * as opts from '../opts'
import * as exec from './exec'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import assert from 'assert'
import ensureError from 'ensure-error'

export type SetupOptionKey =
  | 'ghc-version'
  | 'cabal-version'
  | 'stack-version'
  | 'enable-stack'
  | 'stack-no-global'
  | 'stack-setup-ghc'
  | 'disable-matcher'

export const setupOptionKeys: SetupOptionKey[] = [
  'ghc-version',
  'cabal-version',
  'stack-version',
  'enable-stack',
  'stack-no-global',
  'stack-setup-ghc',
  'disable-matcher'
]

export type SetupOptions = Partial<Record<SetupOptionKey, string>>

export async function setup(
  options: Readonly<opts.SetupOptions>
): Promise<opts.SetupOptions> {
  // Try the pre-installed software:
  const preInstalled = await tryPreInstalled(options)
  if (preInstalled !== null) return preInstalled

  // Otherwise, use haskell/actions/setup:
  // 1. Find the latest compatible version from 'ghc-version-range':
  const afterSetup: Partial<opts.SetupOptions> = {}
  afterSetup['ghc-version'] = latestSatisfyingGhcVersion(options)
  // 2. Run haskell/actions/setup:
  await setupHaskell({...options, ...afterSetup} as Record<string, string>)
  core.setOutput('haskell-setup', 'true')
  // 3. Update the Cabal version:
  if (options['enable-stack'] !== '' && options['stack-no-global'] !== '') {
    afterSetup['cabal-version'] = await getStackCabalVersionForGhc(
      afterSetup['ghc-version']
    )
  } else {
    afterSetup['cabal-version'] = await getSystemCabalVersion()
  }
  // 3. Update the Stack version:
  if (options['enable-stack'] !== '') {
    afterSetup['stack-version'] = await getSystemStackVersion()
  }
  return {...options, ...afterSetup}
}

async function tryPreInstalled(
  options: Readonly<opts.SetupOptions>
): Promise<opts.SetupOptions | null> {
  // If we need Stack, we cannot use the pre-installed tools:
  if (options['enable-stack'] !== '') return null

  const preInstalled: Partial<opts.SetupOptions> = {}

  // Get pre-installed GHC version:
  try {
    preInstalled['ghc-version'] = await getSystemGhcVersion()
  } catch (error) {
    core.debug(`No pre-installed GHC: ${ensureError(error).message}`)
    return null
  }

  // Get pre-installed Cabal version:
  try {
    preInstalled['cabal-version'] = await getSystemCabalVersion()
  } catch (error) {
    core.debug(`No pre-installed Cabal: ${ensureError(error).message}`)
    return null
  }

  // Check if the pre-installed GHC satisfies the version range:
  if (
    semver.satisfies(preInstalled['ghc-version'], options['ghc-version-range'])
  ) {
    core.info(
      [
        `Found GHC ${preInstalled['ghc-version']}`,
        `which is compatible with Agda ${options['agda-version']}`
      ].join(', ')
    )
    return {...options, ...preInstalled}
  } else {
    core.debug(
      [
        `Found GHC ${preInstalled['ghc-version']}`,
        `which is incompatible with Agda ${options['agda-version']}`
      ].join(', ')
    )
    return null
  }
}

function latestSatisfyingGhcVersion(
  options: Readonly<opts.SetupOptions>
): string {
  const ghcVersions = options['ghc-version-range']
    .split('||')
    .map(version => version.trim())
  assert(
    ghcVersions.every(version => semver.valid(version)),
    [
      `Input 'ghc-version-range' should be resolved to list of concrete versions separated by '||'`,
      `found '${options['ghc-version-range']}'`
    ].join(', ')
  )
  const ghcVersion = semver.maxSatisfying(ghcVersions, '*')
  if (ghcVersion === null) {
    throw Error(
      `No compatible GHC versions found: ${options['ghc-version-range']}`
    )
  } else {
    return ghcVersion
  }
}

export async function execSystemGhc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.execOutput('ghc', args, execOptions)
}

export async function execSystemCabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.execOutput('cabal', args, execOptions)
}

export async function execSystemStack(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.execOutput('stack', args, execOptions)
}

export async function getSystemGhcVersion(): Promise<string> {
  return exec.getVersion('ghc', {
    versionFlag: '--numeric-version',
    silent: true
  })
}

export async function getSystemCabalVersion(): Promise<string> {
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
