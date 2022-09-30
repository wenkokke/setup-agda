import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    const agda_version: string = core.getInput('agda-version')
    core.debug(agda_version)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
