import * as core from '@actions/core'
import * as os from 'node:os'
import * as opts from '../opts'
import ensureError from './ensure-error'
import {patchelf} from './app/patchelf'
import {otool} from './app/otool'
import {dumpbin} from './app/dumpbin'

export * from './app/patchelf'
export * from './app/otool'
export * from './app/dumpbin'

export async function printNeeded(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.platform) {
      case 'linux': {
        output = await patchelf('--print-needed', binPath)
        break
      }
      case 'darwin': {
        output = await otool('-L', binPath)
        break
      }
      case 'win32': {
        output = await dumpbin('/imports', binPath)
        break
      }
    }
    core.info(`Needed libraries:${os.EOL}${output}`)
  } catch (error) {
    core.info(ensureError(error).message)
  }
}
