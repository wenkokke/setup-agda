import * as core from '@actions/core'
import assert from 'node:assert'
import setupHaskellAction from 'setup-haskell'
import { SetupHaskellActionOptions } from '../util/types.js'

export default async function setupHaskell(
  options: Partial<SetupHaskellActionOptions>
): Promise<void> {
  assert(options['ghc-version'] !== 'recommended')
  const inputs = Object.fromEntries<string>(
    Object.entries(options).map((kv) => {
      const [key, value] = kv
      if (typeof value === 'string') {
        return [key, value]
      } else {
        return [key, value ? 'true' : '']
      }
    })
  )
  core.setOutput('setup-haskell', 'true')
  await setupHaskellAction.default(inputs as Record<string, string>)
}
