import * as exec from '../exec.js'

export default async function xattr(
  args: string[],
  options?: exec.ExecOptions
): Promise<string> {
  return await exec.exec('xattr', args, options)
}
