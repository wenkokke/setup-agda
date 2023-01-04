import * as exec from '../exec'

export async function otool(...args: string[]): Promise<string> {
  return await exec.getOutput('otool', args)
}
