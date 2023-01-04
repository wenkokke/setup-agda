import * as exec from '../exec'
import * as opts from '../../opts'
import assert from 'node:assert'

export async function chmod(...args: string[]): Promise<string> {
  assert(opts.platform !== 'win32', 'MSYS2 does not support chmod')
  return await exec.getOutput('chmod', args)
}
