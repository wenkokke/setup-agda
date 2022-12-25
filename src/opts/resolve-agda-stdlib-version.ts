import assert from 'node:assert'
import * as logging from '../util/logging'
import * as simver from '../util/simver'
import * as opts from './types'

export default function resolveAgdaStdlibVersion(
  agdaVersion: opts.AgdaVersion | 'HEAD' | 'nightly',
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
    logging.info(`Resolved latest Agda version to ${latest}`)
    return latest
  } else if (agdaStdlibVersionSpec === 'recommended') {
    if (agdaVersion === 'HEAD' || agdaVersion === 'nightly') {
      return 'experimental'
    } else {
      const {compatibility} = opts.agdaInfo[agdaVersion]
      const compatibleVersions = compatibility['agda-stdlib']
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
