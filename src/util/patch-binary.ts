import * as core from '@actions/core'
import * as os from 'node:os'
import * as opts from '../opts'
import ensureError from './ensure-error'
import * as exec from './exec'

export async function printNeeded(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.os) {
      case 'linux': {
        output = await patchelf('--print-needed', binPath)
        break
      }
      case 'macos': {
        output = await otool('-L', binPath)
        break
      }
      case 'windows': {
        output = await dumpbin('/imports', binPath)
        break
      }
    }
    core.info(`Needed libraries:${os.EOL}${output}`)
  } catch (error) {
    core.info(ensureError(error).message)
  }
}

export async function patchelf(...args: string[]): Promise<string> {
  return await exec.getOutput('patchelf', args)
}

export async function otool(...args: string[]): Promise<string> {
  return await exec.getOutput('otool', args)
}

export async function installNameTool(...args: string[]): Promise<string> {
  return await exec.getOutput('install_name_tool', args)
}

export async function dumpbin(...args: string[]): Promise<string> {
  return await exec.getOutput('dumpbin', args)
}
