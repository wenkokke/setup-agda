import * as core from '@actions/core'
import {OS} from './opts'
import setupAgda from './setup-agda'

async function run(): Promise<void> {
  try {
    const agdaVersion: string = core.getInput('agda-version')
    const os = process.platform as OS
    setupAgda(agdaVersion, os)
  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message)
  }
}

run()
