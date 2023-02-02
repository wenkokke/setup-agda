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
  build?: boolean | string
  configureOption?: string[]
  verbosity?: Verbosity
}

program
  .command('install')
  .description('Install Agda or an Agda library.')
  .argument('<installable>')
  .argument('<version-or-url>')
  .option('--build [bundle]', 'build Agda from source', false)
  .option('--configure-option [options...]', 'options passed to Cabal')
  .option('--verbosity [verbosity]', 'set the verbosity', 'info')
  .action(install)

async function install(
  installable: string,
  version: string,
  options: InstallCommandOptions
): Promise<never> {
  // Validate & set verbosity:
  if (options.verbosity !== undefined) {
    logger.setVerbosity(options.verbosity)
  }
  // Validate --build flag:
  if (![undefined, true, false, 'bundle'].includes(options.build)) {
    logger.error(
      `unsupported value for --build: expected --build or --build=bundle`
    )
    exit(1)
  }
  switch (installable.toLowerCase()) {
    case 'agda': {
      try {
        const actionOptions = await getOptions({
          'agda-version': version,
          bundle: options.build === 'bundle' ? 'true' : ''
        })
        if (!options.build) {
          const installOptions = pickInstallOptions(actionOptions)
          await logger.group(
            `Install Agda ${installOptions['agda-version']} from prebuilt binaries`,
            async () => await installAgda(installOptions)
          )
        } else {
          const buildOptions = await pickBuildOptions(actionOptions)
          buildOptions.verbosity = options.verbosity // Set verbosity
          await logger.group(
            `Install Agda ${buildOptions['agda-version']} from source`,
            async () => await buildAgda(buildOptions)
          )
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
  // Validate & set verbosity:
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
