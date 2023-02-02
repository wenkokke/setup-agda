import { execa } from 'execa'
import pick from 'object.pick'
import which from 'which'
import { ExecError } from './errors.js'

export interface ExecOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  stderr?: boolean
}

export default exec

async function exec(
  file: string,
  args: string[],
  options: ExecOptions & { stderr: true }
): Promise<{ stdout: string; stderr: string }>

async function exec(
  file: string,
  args: string[],
  options?: ExecOptions | undefined
): Promise<string>

async function exec(
  file: string,
  args: string[],
  options?: ExecOptions
): Promise<string | { stdout: string; stderr: string }> {
  const execaOptions = pick(options ?? {}, ['cwd', 'env'])
  const result = await execa(file, args, execaOptions)
  if (result.exitCode === 0) {
    if (options?.stderr === true) {
      return pick(result, ['stdout', 'stderr'])
    } else {
      return result.stdout
    }
  } else {
    throw new ExecError(result)
  }
}

exec.which = async (file: string): Promise<string> => {
  return await which(file)
}
