import * as core from '@actions/core'
import setupAgda from './setup-agda'

async function run(): Promise<void> {
  try {
    const agdaVersion: string = core.getInput('agda-version')
    setupAgda(agdaVersion)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
