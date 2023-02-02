import exec, { ExecOptions } from '../exec.js'

export default async function patchelf(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('patchelf', args, options)
}
