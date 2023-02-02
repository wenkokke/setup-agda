import exec, { ExecOptions } from '../exec.js'

export default async function tar(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('unzip', args, options)
}
