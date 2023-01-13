import { program } from 'commander'
import {
  getOptions,
  pickBuildOptions,
  pickInstallOptions,
  version
} from './util/types'
import installAgda from './cli/install'
import buildAgda from './cli/build'
import { exit } from 'node:process'
import ensureError from 'ensure-error'

program
  .name('agdaup')
  .description('The Agda toolchain manager.')
  .version(version)

program
  .command('install')
  .description('Install Agda or an Agda library.')
  .argument('<installable>')
  .argument('<version-or-url>')
  .option('--build', 'build Agda from source', false)
  .option('--configure-option [options...]', 'options passed to Cabal')
  .action(install)

interface CliInstallOptions {
  build?: boolean
  configureOption?: string[]
}

async function install(
  installable: string,
  version: string,
  options: CliInstallOptions
): Promise<never> {
  switch (installable.toLowerCase()) {
    case 'agda': {
      try {
        const actionOptions = await getOptions({
          'agda-version': version
        })
        if (!options.build) {
          const installOptions = pickInstallOptions(actionOptions)
          await installAgda(installOptions)
        } else {
          const buildOptions = await pickBuildOptions(actionOptions)
          await buildAgda(buildOptions)
        }
        return exit(0)
      } catch (error) {
        logger.error(ensureError(error))
        return exit(1)
      }
    }
    default: {
      process.stderr.write(`Library ${installable} is not in the registry.`)
      return exit(1)
    }
  }
}

program.parse()
