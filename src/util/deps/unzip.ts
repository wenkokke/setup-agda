import * as exec from '../exec.js'

export default async function tar(
  args: string[],
  options?: exec.ExecOptions
): Promise<string> {
  return await exec.exec('unzip', args, options)
}
