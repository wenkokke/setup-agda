import {agdaInstallDir, BuildOptions} from '../opts'
import {ensureError} from '../util'
import * as logging from '../util/logging'
import install from '../cli/install'

export default async function installFromBdist(
  options: BuildOptions
): Promise<string | null> {
  try {
    // NOTE: the install command always installs to agdaInstallDir,
    //       and this is a temporary workaround until the build command
    //       likewise builds & installs to agdaInstallDir, at which
    //       point it is no longer necessary to return a directory
    const installDir = agdaInstallDir(options['agda-version'])
    await install(options['agda-version'])
    return installDir
  } catch (error) {
    logging.warning(ensureError(error))
    return null
  }
}
