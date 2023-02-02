import os from 'node:os'
import exec, { ExecOptions } from '../exec.js'
import otool from './otool.js'

export default async function installNameTool(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('install_name_tool', args, options)
}

installNameTool.change = async (
  libFrom: string,
  libTo: string,
  target: string,
  options?: ExecOptions
): Promise<void> => {
  const sharedLibraries = await otool.getSharedLibraries(target, options)
  if (!sharedLibraries.includes(libFrom)) {
    const prettySharedLibraryList = sharedLibraries
      .map((sharedLibrary) => `-  ${sharedLibrary}`)
      .join(os.EOL)
    throw Error(
      `${target} does not use shared library ${libFrom}:${os.EOL}${prettySharedLibraryList}`
    )
  }
  await installNameTool(['-change', libFrom, libTo, target], options)
}
