import exec, { ExecOptions } from '../exec.js'

export default async function patchelf(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('patchelf', args, options)
}
