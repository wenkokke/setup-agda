import exec, { ExecOptions } from '../exec.js'

export default async function patchelf(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('patchelf', args, options)
}
patchelf.getSharedLibaries = async (
  target: string,
  options?: ExecOptions
): Promise<string> => {
  const { stdout } = await exec('patchelf', ['--print-needed', target], options)
  return stdout
}
