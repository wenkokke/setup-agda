import exec, { ExecOptions } from '../exec.js'

// TODO: edit ExecOptions.env.PATH instead of passing upxPath

export default async function upx(
  upxPath: string | null,
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec(upxPath ?? 'upx', args, options)
}
