import * as core from '@actions/core'
import * as opts from './opts'
import downloadNightly from './setup-agda/download-nightly'
import buildAgda from './setup-agda/build-from-source'

export default async function setup(
  options?: Partial<opts.SetupOptions>
): Promise<void> {
  try {
    const fullOptions = opts.setDefaults(options)
    // NOTE: we currently do not support 'stack-no-global'
    if (fullOptions['stack-no-global'] !== '') {
      throw Error(`setup-agda: unsupported option 'stack-no-global'`)
    }
    if (fullOptions['agda-version'] === 'nightly') {
      await downloadNightly()
    } else {
      await buildAgda(fullOptions)
    }
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error)
    }
  }
}
