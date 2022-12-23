import * as exec from '../exec'

export async function xattr(...args: string[]): Promise<string> {
  return await exec.getOutput('xattr', args)
}
