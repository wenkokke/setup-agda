import * as exec from '../exec'

export async function patchelf(...args: string[]): Promise<string> {
  return await exec.getOutput('patchelf', args)
}
