import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

export async function dumpbin(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.getOutput('dumpbin', args, options)
}
