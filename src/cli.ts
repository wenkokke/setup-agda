import { program } from 'commander'
import {
  getOptions,
  pickBuildOptions,
  pickInstallOptions,
  pickSetOptions,
  version
} from './util/types.js'
import installAgda from './cli/install.js'
import buildAgda from './cli/build.js'
import setAgda from './cli/set.js'
import { exit } from 'node:process'
import ensureError from 'ensure-error'
import tui from './cli/tui.js'

program
  .name('agdaup')
  .description('The Agda toolchain manager.')
  .version(version)

// Text UI

program.command('tui').action(tui)

// Install

program
  .command('install')
  .description('Install Agda or an Agda library.')
  .argument('<installable>')
  .argument('<version-or-url>')
  .option('--build', 'build Agda from source', false)
  .option('--bundle', 'bundle ICU with Agda', false)
  .option('--configure-option [options...]', 'options passed to Cabal')
  .action(install)

interface CliInstallOptions {
  build?: boolean
  bundle?: boolean
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
          'agda-version': version,
          bundle: options.bundle ? 'true' : ''
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
      process.stderr.write(`Cannot install '${installable}'`)
      return exit(1)
    }
  }
}

// Set

program
  .command('set')
  .description('Set the current Agda version.')
  .argument('<settable>')
  .argument('<version>')
  .action(set)

async function set(settable: string, version: string): Promise<never> {
  switch (settable.toLowerCase()) {
    case 'agda': {
      try {
        const actionOptions = await getOptions({
          'agda-version': version
        })
        await setAgda(pickSetOptions(actionOptions))
        return exit(0)
      } catch (error) {
        logger.error(ensureError(error))
        return exit(1)
      }
    }
    default: {
      process.stderr.write(`Cannot set '${settable}'`)
      return exit(1)
    }
  }
}

program.parse()
