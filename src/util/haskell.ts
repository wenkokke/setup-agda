import * as core from '@actions/core'
import * as opts from '../opts'
import * as exec from './exec'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import assert from 'assert'

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
): Promise<void> {
  // Try current GHC version:
  try {
    const ghcVersion = await getSystemGhcVersion()
    if (semver.satisfies(ghcVersion, options['ghc-version-range'])) {
      core.info(
        [
          `Found GHC ${ghcVersion}`,
          `which is compatible with Agda ${options['agda-version']}`
        ].join(', ')
      )
      return // Found compatible GHC version
    } else {
      core.debug(
        [
          `Found GHC ${ghcVersion}`,
          `which is incompatible with Agda ${options['agda-version']}`
        ].join(', ')
      )
    }
  } catch (error) {
    core.debug(`Could not find GHC: ${error}`)
  }
  // Extract concrete version numbers:
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
  // Install latest version:
  const ghcVersion = semver.maxSatisfying(ghcVersions, '*')
  await setupHaskell({...options, 'ghc-version': ghcVersion} as Record<
    string,
    string
  >)
  // Set the output 'haskell-setup'
  core.setOutput('haskell-setup', 'true')
}

export async function execSystemCabal(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.execOutput('cabal', args, execOptions)
}

export async function execSystemGhc(
  args: string[],
  execOptions?: exec.ExecOptions
): Promise<string> {
  return await exec.execOutput('ghc', args, execOptions)
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
