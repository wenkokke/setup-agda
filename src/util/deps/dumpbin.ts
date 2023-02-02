import exec, { ExecOptions } from '../exec.js'

export async function dumpbin(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  const { stdout } = await exec('dumpbin', args, options)
  return stdout
}
