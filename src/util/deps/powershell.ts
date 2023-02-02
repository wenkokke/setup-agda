import exec, { ExecOptions } from '../exec.js'

const name = 'powershell'

export default async function powershell(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec(name, args, options)
}

powershell.which = async (): Promise<string | null> => {
  return exec.which(name)
}

powershell.exists = async (): Promise<boolean> => {
  const powershellPath = await exec.which(name)
  return powershellPath !== null
}
