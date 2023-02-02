import exec, { ExecOptions } from '../exec.js'

export default async function tar(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('tar', args, options)
}

tar.isGNU = async (): Promise<boolean> => {
  const { stdout } = await exec('tar', ['--version'])
  return stdout.toUpperCase().includes('GNU TAR')
}
