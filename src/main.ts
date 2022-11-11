import * as core from '@actions/core'
import * as opts from './opts'
import setupAgda from './setup-agda'

async function main(): Promise<void> {
  const options = await opts.getOptions(core.getInput)
  await setupAgda(options)
}

main()
