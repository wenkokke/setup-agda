import ensureError from 'ensure-error'
import { execa } from 'execa'
import path from 'node:path'
import pick from 'object.pick'
import which from 'which'

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
  logger.debug(
    [
      path.basename(file),
      ...args.map((arg) => {
        if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
          return `"${arg.replace('"', '\\"')}"`
        } else {
          return arg
        }
      })
    ].join(' ')
  )
  const result = await execa(file, args, {
    cwd: options?.cwd,
    env: { ...options?.env, PATH: process.env.PATH }
  })
  if (result.failed) {
    throw result
  } else {
    if (options?.stderr === true) {
      return pick(result, ['stdout', 'stderr'])
    } else {
      return result.stdout
    }
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
