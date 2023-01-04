import * as exec from '../exec'

export async function dumpbin(...args: string[]): Promise<string> {
  return await exec.getOutput('dumpbin', args)
}
