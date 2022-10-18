import * as core from '@actions/core'
import assert from 'node:assert'
import os from 'node:os'
import semver from 'semver'
import bundledHaskellVersionInfo from '../package-info/Haskell.versions.json'
import {BuildOptions} from './types'

// Resolving the GHC version to use:

export default function resolveGhcVersion(
  options: BuildOptions,
  currentVersion: string | null,
  versionsThatCanBuildAgda: string[]
): string {
  assert(versionsThatCanBuildAgda.length > 0)
  // Print configuration:
  const versionsThatCanBeSetUp = bundledHaskellVersionInfo.ghc
  core.info(
    [
      'Resolving GHC version:',
      options['ghc-version'] === 'recommended'
        ? `- selecting latest supported GHC version`
        : `- GHC version must be exactly ${options['ghc-version']}`,
      `- GHC version must match ${options['ghc-version-range']}`,
      options['ghc-version-match-exact']
        ? '- GHC version must match exactly'
        : '- GHC version must match in major and minor number',
      currentVersion === null
        ? '- no GHC version is currently installed'
        : `- GHC version ${currentVersion} is currently installed`,
      `- haskell/actions/setup supports GHC versions:`,
      `  ${versionsThatCanBeSetUp.join(', ')}`,
      `- Agda ${options['agda-version']} supportes GHC versions:`,
      `  ${versionsThatCanBuildAgda.join(', ')}`
    ].join(os.EOL)
  )

  // Helpers for finding version matches:
  const match = options['ghc-version-match-exact']
    ? (v1: string, v2: string): boolean => semver.eq(v1, v2)
    : (v1: string, v2: string): boolean =>
        semver.major(v1) === semver.major(v2) &&
        semver.minor(v1) === semver.minor(v2)
  const someMatch = (vs: string[], v1: string): boolean =>
    vs.some(v2 => match(v1, v2))
  const canBuildAgda = (v: string): boolean =>
    someMatch(versionsThatCanBuildAgda, v)
  const canBeSetUp = (v: string): boolean =>
    someMatch(versionsThatCanBeSetUp, v)

  // If exact version was specified, emit warnings:
  if (options['ghc-version'] !== 'recommended') {
    // Check if Agda version supports specified version:
    if (!canBuildAgda(options['ghc-version']))
      core.warning(
        `User-specified GHC ${options['ghc-version']} is not supported by Agda ${options['agda-version']}`
      )
    // Check if haskell/actions/setup supports specified version:
    if (
      !canBeSetUp(options['ghc-version']) &&
      (currentVersion === null ||
        !match(options['ghc-version'], currentVersion))
    )
      core.warning(
        `User-specified GHC ${options['ghc-version']} is not supported by haskell/actions/setup`
      )
    core.info(`Selecting GHC ${options['ghc-version']}: user-specified`)
    return options['ghc-version']
  }

  // Check if the currently installed version matches:
  if (currentVersion !== null && canBuildAgda(currentVersion)) {
    core.info(`Selecting GHC ${currentVersion}: it is currently installed`)
    return currentVersion
  }

  // Find which versions are supported:
  core.info('Compiling list of GHC version candidates...')
  const versionCandidates = []
  if (
    options['enable-stack'] &&
    options['stack-setup-ghc'] &&
    options['stack-no-global']
  ) {
    // NOTE: We ASSUME stack can setup ANY version of GHC, as I could not find
    //       a published list of supported versions. Therefore, we start from
    //       the list of versions that can build Agda.
    for (const version of versionsThatCanBuildAgda)
      if (!semver.satisfies(version, options['ghc-version-range']))
        core.info(`Reject GHC ${version}: excluded by user-provided range`)
      else versionCandidates.push(version)
  } else {
    // NOTE: We start from the list of versions that can be set up, and allow
    //       any version that matches a version that can build Agda.
    // NOTE: This potentially returns a version that does not have a matching
    //       stack-<version>.yaml file, which the stack build code has to
    //       account for.
    for (const version of versionsThatCanBeSetUp)
      if (!canBuildAgda(version))
        core.info(`Reject GHC ${version}: unsupported by Agda`)
      else if (!semver.satisfies(version, options['ghc-version-range']))
        core.info(`Reject GHC ${version}: excluded by user-provided range`)
      else versionCandidates.push(version)
  }
  if (versionCandidates.length === 0) throw Error('No GHC version candidates')
  else core.info(`GHC version candidates: ${versionCandidates.join(', ')}`)

  // Select the latest GHC version from the list of candidates:
  const selected = semver.maxSatisfying(versionCandidates, '*')
  assert(
    selected !== null,
    `Call to semver.maxSatisfying([${versionCandidates
      .map(v => `'${v}'`)
      .join(', ')}], '*') returned null`
  )
  core.info(`Selecting GHC ${selected}: latest supported version`)
  return selected
}
