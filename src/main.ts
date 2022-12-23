import * as core from '@actions/core'
import * as opts from './opts'
import setupAgda from './setup-agda'
import ensureError from './util/ensure-error'

async function main(): Promise<void> {
  const options = await opts.getOptions(core.getInput)
  try {
    await setupAgda(options)
  } catch (error) {
    core.setFailed(ensureError(error))
  }
}

main()
