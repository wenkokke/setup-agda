import glob from 'glob'
import path from 'node:path'
import agda, { AgdaOptions } from '../util/deps/agda.js'
import { ExecOptions } from '../util/exec.js'

export default async function test(
  options?: Partial<AgdaOptions> & ExecOptions
): Promise<void> {
  const versionString = await agda.getVersion(options)
  logger.debug(`Found Agda version ${versionString}`)
  const dataDir = await agda.getDataDir(options)
  logger.debug(`Found Agda data directory at ${dataDir}`)
  for (const agdaFile of glob.sync(
    path.join(dataDir, 'lib', 'prim', '**', '*.agda')
  )) {
    logger.debug(`Compiling ${agdaFile}`)
    await agda(['-v0', agdaFile], {
      ...options,
      cwd: path.join(dataDir, 'lib', 'prim')
    })
  }
}
