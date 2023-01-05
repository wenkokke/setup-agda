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
      const agdaStdlibVersionRange =
        opts.agdaInfo[agdaVersion].compatibility?.['agda-stdlib']
      if (agdaStdlibVersionRange === undefined)
        throw Error(
          `No known compatible agda-stdlib versions for ${agdaVersion}; check Agda.yml?`
        )
      const recommended = simver.maxSatisfying(
        opts.agdaStdlibVersions,
        agdaStdlibVersionRange
      )
      assert(
        recommended !== null,
        [
          `Could not resolve recommended agda-stdlib version`,
          `from compatible versions ${agdaStdlibVersionRange}`
        ].join(' ')
      )
      assert(
        opts.isAgdaStdlibVersion(recommended),
        [
          `Resolved recommended agda-stdlib version to version '${recommended}'`,
          `not in list of compatible versions ${agdaStdlibVersionRange}`
        ].join(' ')
      )
      return recommended
    }
  } else {
    return agdaStdlibVersionSpec
  }
}
