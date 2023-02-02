import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

export default async function patchelf(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.exec('patchelf', args, options)
}
