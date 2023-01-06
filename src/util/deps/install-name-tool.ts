import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

export default async function installNameTool(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.getOutput('install_name_tool', args, options)
}
