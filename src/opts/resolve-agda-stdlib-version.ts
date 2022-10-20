import * as core from '@actions/core'
import assert from 'node:assert'
import * as simver from '../util/simver'
import * as opts from './types'

export default function resolveAgdaStdlibVersion(
  agdaVersion: opts.AgdaVersion | 'HEAD',
  agdaStdlibVersionSpec: opts.AgdaStdlibVersionSpec
): opts.AgdaStdlibVersion | 'experimental' | 'none' {
  if (agdaStdlibVersionSpec === 'none') {
    return agdaStdlibVersionSpec
  } else if (agdaStdlibVersionSpec === 'latest') {
    const latest = simver.max(opts.agdaStdlibVersions)
    assert(
      latest !== null,
      [
        `Could not resolve latest agda-stdlib version`,
        `from list of known versions [${opts.agdaStdlibVersions.join(', ')}]`
      ].join(' ')
    )
    assert(
      opts.isAgdaStdlibVersion(latest),
      [
        `Resolved latest agda-stdlib version to version '${latest}'`,
        `not in list of known versions [${opts.agdaStdlibVersions.join(', ')}]`
      ].join(' ')
    )
    core.info(`Resolved latest Agda version to ${latest}`)
    return latest
  } else if (agdaStdlibVersionSpec === 'recommended') {
    if (agdaVersion === 'HEAD') {
      return 'experimental'
    } else {
      const compatibleVersions =
        opts.agdaVersionToCompatibleAgdaStdlibVersions[agdaVersion]
      const recommended = simver.max(compatibleVersions)
      assert(
        recommended !== null,
        [
          `Could not resolve recommended agda-stdlib version`,
          `from compatible versions ${compatibleVersions.join(', ')}`
        ].join(' ')
      )
      assert(
        opts.isAgdaStdlibVersion(recommended),
        [
          `Resolved recommended agda-stdlib version to version '${recommended}'`,
          `not in list of compatible versions ${compatibleVersions.join(', ')}`
        ].join(' ')
      )
      return recommended
    }
  } else {
    return agdaStdlibVersionSpec
  }
}
