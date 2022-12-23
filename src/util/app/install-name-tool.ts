import * as exec from '../exec'

export async function installNameTool(...args: string[]): Promise<string> {
  return await exec.getOutput('install_name_tool', args)
}
