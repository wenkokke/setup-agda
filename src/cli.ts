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

interface InstallCommandOptions {
  build?: boolean
  bundle?: boolean
  configureOption?: string[]
  verbosity?: Verbosity
}

program
  .command('install')
  .description('Install Agda or an Agda library.')
  .argument('<installable>')
  .argument('<version-or-url>')
  .option('--build', 'build Agda from source', false)
  .option('--bundle', 'bundle ICU with Agda', false)
  .option('--configure-option [options...]', 'options passed to Cabal')
  .option('--verbosity [verbosity]', 'set the verbosity', 'info')
  .action(install)

program
  .command('build')
  .description('Alias for install with --build.')
  .argument('<installable>')
  .argument('<version>')
  .option('--bundle', 'bundle ICU with Agda', false)
  .option('--configure-option [options...]', 'options passed to Cabal')
  .option('--verbosity [verbosity]', 'set the verbosity', 'info')
  .action(build)

async function build(
  installable: string,
  version: string,
  options: InstallCommandOptions
): Promise<never> {
  return await install(installable, version, { ...options, build: true })
}

async function install(
  installable: string,
  version: string,
  options: InstallCommandOptions
): Promise<never> {
  if (options.verbosity !== undefined) {
    logger.setVerbosity(options.verbosity)
  }
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
          buildOptions.verbosity = options.verbosity // Set verbosity
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
  .option('--verbosity [verbosity]', 'set the verbosity', 'info')
  .action(set)

interface SetCommandOptions {
  verbosity?: Verbosity
}

async function set(
  settable: string,
  version: string,
  options: SetCommandOptions
): Promise<never> {
  if (options.verbosity !== undefined) {
    logger.setVerbosity(options.verbosity)
  }
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
