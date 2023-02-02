import exec, { ExecOptions } from '../exec.js'

export async function dumpbin(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('dumpbin', args, options)
}
