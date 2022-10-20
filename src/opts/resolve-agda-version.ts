import * as core from '@actions/core'
import assert from 'node:assert'
import * as simver from '../util/simver'
import * as opts from './types'

export default function resolveAgdaVersion(
  versionSpec: opts.AgdaVersionSpec
): opts.AgdaVersion | 'HEAD' {
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
    core.info(`Resolved latest Agda version to ${latest}`)
    core.setOutput('agda-version', latest)
    return latest
  } else if (versionSpec === 'nightly') {
    throw Error('Unsupported Agda version: "nightly"')
  } else {
    core.setOutput('agda-version', versionSpec)
    return versionSpec
  }
}
