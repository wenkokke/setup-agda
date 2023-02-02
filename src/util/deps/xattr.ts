import exec, { ExecOptions } from '../exec.js'

export default async function xattr(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('xattr', args, options)
}
