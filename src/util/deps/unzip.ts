import exec, { ExecOptions } from '../exec.js'

export default async function tar(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('unzip', args, options)
}
