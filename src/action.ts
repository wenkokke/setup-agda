import * as core from '@actions/core'
import setupAgda from './action/setup-agda.js'
import ensureError from 'ensure-error'
import { getOptions } from './util/types.js'

async function main(): Promise<void> {
  const actionOptions = getOptions(core.getInput)
  try {
    await setupAgda(actionOptions)
  } catch (error) {
    core.setFailed(ensureError(error))
  }
}

void main()
