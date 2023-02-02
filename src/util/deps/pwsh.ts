import exec, { ExecOptions } from '../exec.js'

const name = 'pwsh'

export default async function pwsh(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec(name, args, options)
}

pwsh.which = async (): Promise<string | null> => {
  return exec.which(name)
}

pwsh.exists = async (): Promise<boolean> => {
  const pwshPath = await exec.which(name)
  return pwshPath !== null
}
