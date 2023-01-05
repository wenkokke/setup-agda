import assert from 'node:assert'
import semver from 'semver'
import bundledHaskellVersionInfo from '../data/Haskell.versions.json'
import * as opts from './types'

// Resolving the GHC version to use:

export default function resolveGhcVersion(
  agdaVersion: opts.AgdaVersion | 'HEAD' | 'nightly',
  ghcVersionSpec: string
): string {
  if (ghcVersionSpec === 'recommended') {
    if (agdaVersion === 'nightly')
      throw Error('Cannot build Agda nightly; did you mean HEAD?')

    const ghcVersionRange =
      agdaVersion === 'HEAD'
        ? '*'
        : opts.agdaInfo[agdaVersion].compatibility?.ghc
    if (ghcVersionRange === undefined)
      throw Error(
        `Could not determine compatible GHC versions for Agda ${agdaVersion}`
      )

    const ghcVersion = semver.maxSatisfying(
      bundledHaskellVersionInfo.ghc,
      ghcVersionRange
    )
    if (ghcVersion === null)
      throw Error(`Cannot setup GHC version satisfying ${ghcVersionRange}`)
    return ghcVersion
  } else if (ghcVersionSpec === 'latest') {
    const ghcVersion = semver.maxSatisfying(bundledHaskellVersionInfo.ghc, '*')
    assert(ghcVersion !== null)
    return ghcVersion
  } else {
    return ghcVersionSpec
  }
}
