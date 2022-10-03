import * as core from '@actions/core'
import * as os from 'os'
import {Platform} from './utils'

export default async function setupAgdaLatest(): Promise<void> {
  const platform = os.platform() as Platform
  core.debug(`Setup 'latest' on ${platform}`)
}
