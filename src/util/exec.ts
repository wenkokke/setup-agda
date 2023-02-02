import ensureError from 'ensure-error'
import { execa } from 'execa'
import path from 'node:path'
import pick from 'object.pick'
import which from 'which'
import { logStream } from './log.js'

export interface ExecOptions {
  cwd?: string
  env?: Partial<NodeJS.ProcessEnv>
}

export default exec

async function exec(
  file: string,
  args: string[],
  options?: ExecOptions
): Promise<{ stdout: string; stderr: string }> {
  logger.debug(command(file, args))
  const handle = execa(file, args, {
    cwd: options?.cwd,
    env: { ...options?.env, PATH: process.env.PATH }
  })
  if (handle.stdout !== null) logStream(handle.stdout, 'debug')
  if (handle.stderr !== null) logStream(handle.stderr, 'debug')
  const result = await handle
  if (result.failed) {
    throw result
  } else {
    return pick(result, ['stdout', 'stderr'])
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

function command(file: string, args: string[]): string {
  return [
    path.basename(file),
    ...args.map((arg) => {
      if (arg.includes(' ') || arg.includes('"') || arg.includes("'")) {
        return `"${arg.replace('"', '\\"')}"`
      } else {
        return arg
      }
    })
  ].join(' ')
}
