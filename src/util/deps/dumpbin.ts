import exec, { ExecOptions } from '../exec.js'

export async function dumpbin(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('dumpbin', args, options)
}

dumpbin.getSharedLibraries = async (
  target: string,
  options?: ExecOptions
): Promise<string> => {
  const { stdout } = await exec('dumpbin', ['/DEPENDENTS', target], options)
  return stdout
}
