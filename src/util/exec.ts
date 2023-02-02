import ensureError from 'ensure-error'
import { execa } from 'execa'
import pick from 'object.pick'
import which from 'which'
import { ExecError } from './errors.js'

export interface ExecOptions {
  cwd?: string
  env?: Partial<NodeJS.ProcessEnv>
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
  const result = await execa(file, args, {
    cwd: options?.cwd,
    env: { ...options?.env, PATH: process.env.PATH }
  })
  logger.info(result.command)
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

export interface WhichOptions {
  path?: string
}

exec.which = async (
  file: string,
  options?: WhichOptions
): Promise<string | null> => {
  try {
    const path = options?.path
    if (path === undefined) {
      return await which(file)
    } else {
      return await which(file, { path })
    }
  } catch (error) {
    logger.debug(ensureError(error).message)
    return null
  }
}
