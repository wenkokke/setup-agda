import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

// TODO: edit ExecOptions.env.PATH instead of passing upxPath

export default async function upx(
  upxPath: string | null,
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.getOutput(upxPath ?? 'upx', args, options)
}
