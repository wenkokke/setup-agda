import { program } from 'commander'
import {
  agdaStdlibInfo,
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
import os from 'node:os'
import agda from './util/deps/agda.js'
import installLibrary from './cli/install-library.js'

program
  .name('agdaup')
  .description('The Agda toolchain manager.')
  .version(version)

// Text UI

program.command('tui').action(tui)

// Install

interface InstallCommandOptions {
  build: boolean
  bundle: boolean
  bundleName: string
  bundleLicenseReport: boolean
  configureOption?: string[]
  verbosity?: Verbosity
}

program
  .command('install')
  .description('Install Agda or an Agda library.')
  .argument('<installable>')
  .argument('<version-or-url>')
  .option('--build', 'build Agda from source', false)
  .option('--bundle', 'bundle Agda', false)
  .option(
    '--bundle-name',
    'use as a name for the bundle',
    'agda-{{ agda }}-{{ arch }}-{{ release }}-ghc{{ ghc }}-cabal{{ cabal }}{% if icu %}-icu{{ icu }}{% endif %}'
  )
  .option(
    '--bundle-license-report',
    'include a license report in the bundle',
    false
  )
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
  switch (installable.toLowerCase()) {
    case 'agda': {
      try {
        const actionOptions = await getOptions({
          'agda-version': version
        })
        // Pass bundle options:
        actionOptions.bundle = options.bundle
        actionOptions['bundle-name'] = options.bundleName
        actionOptions['bundle-license-report'] = options.bundleLicenseReport
        if (!options.build) {
          const installOptions = pickInstallOptions(actionOptions)
          await logger.group(
            `Installing Agda ${installOptions['agda-version']} from prebuilt binaries`,
            async () => await installAgda(installOptions)
          )
        } else {
          const buildOptions = await pickBuildOptions(actionOptions)
          buildOptions.verbosity = options.verbosity // Set verbosity
          await logger.group(
            `Installing Agda ${buildOptions['agda-version']} from source`,
            async () => await buildAgda(buildOptions)
          )
        }
        return exit(0)
      } catch (error) {
        logger.error(ensureError(error))
        return exit(1)
      }
    }
    case 'agda-stdlib':
    case 'standard-library': {
      try {
        const agdaVersion = agda.getSetVersion() ?? 'latest'
        const actionOptions = await getOptions({
          'agda-version': agdaVersion,
          'agda-stdlib-version': version
        })
        const agdaStdlibVersion = actionOptions['agda-stdlib-version']
        if (agdaStdlibVersion === 'none') {
          return exit(0)
        }
        const agdaStdlibDist = agdaStdlibInfo[agdaStdlibVersion]
        if (agdaStdlibDist?.source === undefined) {
          logger.fatal(`No distribution for agda-stdlib ${agdaStdlibVersion}`)
          return exit(1)
        }
        await installLibrary(agdaStdlibDist?.source)
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

// List

program.command('list').action(list)

async function list(): Promise<void> {
  const installedVersions = agda.getInstalledVersions()
  const setVersion = agda.getSetVersion()
  process.stdout.write(`Agda versions:${os.EOL}${os.EOL}`)
  for (const installedVersion of installedVersions) {
    if (installedVersion === setVersion) {
      process.stdout.write(`* ${installedVersion}${os.EOL}`)
    } else {
      process.stdout.write(`  ${installedVersion}${os.EOL}`)
    }
  }
}

program.parse()
