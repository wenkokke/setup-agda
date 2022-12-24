import assert from 'node:assert'
import * as simver from '../util/simver'
import {
  AgdaVersion,
  agdaVersions,
  AgdaVersionSpec,
  isAgdaVersion
} from './types'

export default function resolveAgdaVersion(
  versionSpec: AgdaVersionSpec
): AgdaVersion | 'HEAD' | 'nightly' {
  if (versionSpec === 'latest') {
    const latest = simver.max(agdaVersions)
    assert(
      latest !== null,
      [
        `Could not resolve latest Agda version`,
        `from list of known versions ${agdaVersions.join(', ')}`
      ].join(' ')
    )
    assert(
      isAgdaVersion(latest),
      [
        `Resolved latest Agda version to version '${latest}'`,
        `not in list of known versions ${agdaVersions.join(', ')}`
      ].join(' ')
    )
    return latest
  } else {
    return versionSpec
  }
}
