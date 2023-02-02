import fs from 'fs-extra'
import * as path from 'node:path'
import { agdaBinDir, agdaDataDir } from '../util/appdirs.js'
import { agdaComponents, SetOptions } from '../util/types.js'

export default async function set(options: SetOptions): Promise<void> {
  // Ensure the Agda version is installed:
  const versionBinDir = agdaBinDir(options['agda-version'])
  if (!fs.existsSync(versionBinDir))
    throw Error(`${versionBinDir} does not exist`)
  if (!fs.statSync(versionBinDir).isDirectory())
    throw Error(`${versionBinDir} is not a directory`)
  // Ensure the global bin directory exists:
  const globalBinDir = agdaBinDir()
  if (!fs.existsSync(globalBinDir)) await fs.mkdirp(globalBinDir)
  if (!fs.statSync(versionBinDir).isDirectory())
    throw Error(`${versionBinDir} exists and is not a directory`)
  // Link the Agda executables:
  for (const agdaComponent of Object.values(agdaComponents)) {
    const globalBinPath = path.join(globalBinDir, agdaComponent.exe)
    const versionBinPath = path.join(versionBinDir, agdaComponent.exe)
    if (fs.existsSync(globalBinPath)) {
      if (!fs.lstatSync(globalBinPath).isSymbolicLink())
        throw Error(`${globalBinPath} is not a symbolic link`)
      fs.unlinkSync(globalBinPath)
    }
    fs.symlinkSync(versionBinPath, globalBinPath)
  }
  // Link the Agda data directory:
  const versionDataDir = agdaDataDir(options['agda-version'])
  if (!fs.existsSync(versionBinDir))
    throw Error(`${versionBinDir} does not exist`)
  if (!fs.statSync(versionBinDir).isDirectory())
    throw Error(`${versionBinDir} is not a directory`)
  // Clean up the global data directory:
  const globalDataDir = agdaDataDir()
  if (fs.existsSync(globalDataDir)) {
    if (!fs.lstatSync(globalDataDir).isSymbolicLink()) {
      throw Error(`${globalDataDir} exists and is not a symbolic link`)
    } else {
      fs.unlinkSync(globalDataDir)
    }
  }
  // Link the new data directory:
  await fs.mkdirp(path.dirname(globalDataDir))
  fs.symlinkSync(versionDataDir, globalDataDir)
}
