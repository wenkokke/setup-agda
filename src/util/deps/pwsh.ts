import * as exec from '../exec.js'
import { which } from '../exec.js'

const name = 'pwsh'

export default async function pwsh(
  args: string[],
  options?: exec.ExecOptions
): Promise<string> {
  return await exec.exec(name, args, options)
}

pwsh.existsSync = (): boolean => {
  return which.sync(name, { nothrow: true }) !== null
}
