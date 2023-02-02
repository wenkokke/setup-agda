import os from 'node:os'
import * as exec from '../exec.js'
import { ExecOptions } from '../exec.js'
import otool from './otool.js'

export default async function installNameTool(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec.exec('install_name_tool', args, options)
}

installNameTool.change = async (
  libFrom: string,
  libTo: string,
  target: string,
  options?: ExecOptions
): Promise<string> => {
  const sharedLibraries = await otool.getSharedLibraries(target, options)
  if (!sharedLibraries.includes(libFrom)) {
    const prettySharedLibraryList = sharedLibraries
      .map((sharedLibrary) => `-  ${sharedLibrary}`)
      .join(os.EOL)
    throw Error(
      `${target} does not use shared library ${libFrom}:${os.EOL}${prettySharedLibraryList}`
    )
  }
  return await installNameTool(['-change', libFrom, libTo, target], options)
}
