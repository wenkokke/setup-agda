import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

export default async function otool(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.getOutput('otool', args, options)
}
