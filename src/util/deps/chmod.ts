import assert from 'node:assert'
import { platform } from '../platform.js'
import exec, { ExecOptions } from '../exec.js'

export default async function chmod(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  assert(platform !== 'windows', 'MSYS2 does not support chmod')
  return await exec('chmod', args, options)
}
