import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'

export default async function tar(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.exec('tar', args, options)
}

tar.isGNU = async (): Promise<boolean> => {
  const versionOutput = await tar(['--version'])
  return versionOutput.toUpperCase().includes('GNU TAR')
}
