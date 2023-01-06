import * as exec from '../exec.js'
import { which } from '../exec.js'

const name = 'powershell'

export default async function powershell(
  args: string[],
  options?: exec.ExecOptions
): Promise<string> {
  return await exec.getOutput(name, args, options)
}

powershell.existsSync = (): boolean => {
  return which.sync(name, { nothrow: true }) !== null
}
