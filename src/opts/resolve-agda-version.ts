import assert from 'node:assert'
import * as simver from '../util/simver'
import * as opts from './types'
import * as logging from '../util/logging'

export default function resolveAgdaVersion(
  versionSpec: opts.AgdaVersionSpec
): opts.AgdaVersion | 'HEAD' | 'nightly' {
  if (versionSpec === 'latest') {
    const latest = simver.max(opts.agdaVersions)
    assert(
      latest !== null,
      [
        `Could not resolve latest Agda version`,
        `from list of known versions ${opts.agdaVersions.join(', ')}`
      ].join(' ')
    )
    assert(
      opts.isAgdaVersion(latest),
      [
        `Resolved latest Agda version to version '${latest}'`,
        `not in list of known versions ${opts.agdaVersions.join(', ')}`
      ].join(' ')
    )
    logging.info(`Resolved latest Agda version to ${latest}`)
    logging.setOutput('agda-version', latest)
    return latest
  } else {
    logging.setOutput('agda-version', versionSpec)
    return versionSpec
  }
}
