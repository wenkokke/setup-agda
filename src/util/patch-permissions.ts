import * as exec from './exec'
import * as opts from '../opts'
import assert from 'node:assert'

export async function chmod(...args: string[]): Promise<string> {
  assert(opts.os !== 'windows', 'MSYS2 does not support chmod')
  return await exec.getOutput('chmod', args)
}

export async function xattr(...args: string[]): Promise<string> {
  return await exec.getOutput('xattr', args)
}
