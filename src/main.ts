import * as core from '@actions/core'

async function main(): Promise<void> {
  try {
    const agda_version: string = core.getInput('agda-version')
    core.info(agda_version)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

main()
