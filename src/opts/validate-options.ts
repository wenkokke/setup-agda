import ensureError from 'ensure-error'
import Mustache from 'mustache'
import * as os from 'node:os'
import * as semver from 'semver'
import {BuildOptions} from './types'

export default function validateOptions(options: BuildOptions): void {
  if (options['agda-version'] === 'nightly')
    throw Error('Value "nightly" for input "agda-version" is unupported')
  if (!semver.validRange(options['ghc-version-range']))
    throw Error('Input "ghc-version-range" is not a valid version range')
  // If contradictory options are specified, throw an error:
  if (options['force-build'] && options['force-no-build'])
    throw Error('Build or not? What do you want from me? 🤷🏻‍♀️')
  if (options['force-cluster-counting'] && options['force-no-cluster-counting'])
    throw Error('Cluster counting or not? What do you want from me? 🤷🏻‍♀️')
  try {
    // Join various parts of 'bdist-name', if it was defined over multiple lines.
    options['bdist-name'] = options['bdist-name'].split(/\s+/g).join('').trim()
    // Attempt to parse it, to ensure errors are raised early. Caches the result.
    Mustache.parse(options['bdist-name'])
  } catch (error) {
    throw Error(
      [
        `Could not parse bdist-name, '${options['bdist-name']}':`,
        ensureError(error).message
      ].join(os.EOL)
    )
  }
}
