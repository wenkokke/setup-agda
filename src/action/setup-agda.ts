import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import glob from 'glob'
import install from '../commands/install.js'
import build from '../commands/build.js'
import bundle from '../commands/bundle.js'
import {
  ActionOptions,
  agdaComponents,
  agdaStdlibInfo,
  Dist,
  pickBuildOptions,
  pickBundleOptions,
  pickInstallOptions,
  pickSetupHaskellOptions
} from '../util/types.js'
import ensureError from 'ensure-error'
import ghc from '../util/deps/ghc.js'
import setupHaskell from './setup-haskell.js'
import setupCabalPlan from './setup-cabal-plan.js'
import setupIcu from './setup-icu.js'
import { agdaDir, agdaInstallDir } from '../util/appdirs.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { icuNeeded } from '../util/deps/icu.js'
import { splitLines } from '../util/lines.js'
import installLibrary from '../commands/install-library.js'
import registerLibrary from '../commands/register-library.js'
import registerExecutable from '../commands/register-executable.js'
import {
  AgdaLibraryMissingVersionTag,
  AgdaLibraryUnsupportedSpecification
} from '../util/errors.js'

export default async function run(options: ActionOptions): Promise<void> {
  // Find an existing Agda build or build from source:
  const installDir = agdaInstallDir(options['agda-version'])

  // Try to install & build in order:
  let success = false

  // Try to install Agda from a binary distribution:
  if (!options['force-build'] && !success) {
    try {
      // Get install options
      const installOptions = pickInstallOptions(options)
      // Run install
      await install({ ...installOptions, dest: installDir })
      success = true
    } catch (error) {
      logger.error(ensureError(error))
    }
  }

  // Try to install Agda from a source distribution:
  if (!options['force-no-build'] && !success) {
    try {
      // Get build options:
      const buildOptions = await pickBuildOptions(options)

      // Setup ICU if needed:
      if (icuNeeded(buildOptions)) await setupIcu()

      // Get the current GHC version, if any:
      const currentGhcVersion = await ghc.maybeGetVersion()

      // Check if `cabal-plan` is needed, and if so, when to setup it up:
      const whenSetupCabalPlan = await setupCabalPlan.when(buildOptions)
      if (whenSetupCabalPlan === 'before-setup-haskell')
        buildOptions['cabal-plan'] = await setupCabalPlan()

      // Setup required version of GHC:
      if (currentGhcVersion !== buildOptions['ghc-version']) {
        await setupHaskell(pickSetupHaskellOptions(buildOptions))
        // Set 'setup-haskell' output:
        core.setOutput('setup-haskell', true)
      }

      // If we have not yet setup `cabal-plan`, do so now:
      if (whenSetupCabalPlan === 'after-setup-haskell')
        buildOptions['cabal-plan'] = await setupCabalPlan()

      // Run build:
      await build({ ...buildOptions, dest: installDir })
      success = true
    } catch (error) {
      logger.error(ensureError(error))
    }
  }

  // Throw an error if all install methods have failed:
  if (!success) throw Error(`All installation methods have failed`)

  // Create and upload a bundle:
  if (options['bundle-upload']) {
    const bundleOptions = await pickBundleOptions(options)
    const bundleName = await bundle.renderName(
      bundleOptions['bundle-name'],
      bundleOptions
    )
    const bundleDir = path.join(agdaDir(), 'bundles', bundleName)
    await bundle({ ...bundleOptions, dest: bundleDir })

    // Upload bundle:
    const artifactClient = artifact.create()
    const uploadInfo = await artifactClient.uploadArtifact(
      bundleName,
      glob.sync(path.join(bundleDir, '**')),
      bundleDir,
      {
        continueOnError: true,
        retentionDays: parseInt(options['bundle-retention-days'])
      }
    )

    // Report any errors:
    if (uploadInfo.failedItems.length > 0) {
      logger.error(
        ['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL)
      )
    }
  }

  // Setup libraries:
  const librariesToInstall: Dist[] = []
  const librariesToRegister: string[] = []
  const defaultLibraries = splitLines(options['agda-defaults'])

  // If 'agda-stdlib-version' was set, add the correct source distribution to
  // the list of libraries to install:
  // TODO: Move special-case treatment of the standard library to install_library
  if (options['agda-stdlib-version'] !== 'none') {
    const agdaStdlibDist =
      agdaStdlibInfo[options['agda-stdlib-version']]?.source
    if (agdaStdlibDist !== undefined) librariesToInstall.push(agdaStdlibDist)
    else
      throw Error(
        [
          `Could not find source distribution for`,
          `Agda standard library ${options['agda-stdlib-version']}`
        ].join(' ')
      )
  }

  // Process the .git URLs for the libraries:
  for (const libraryUrlOrPath of splitLines(options['agda-libraries'])) {
    // If the entry points to a local .agda-lib file, skip installing it.
    // If the entry is a Git url, create a distribution for the library:
    if (
      libraryUrlOrPath.endsWith('.agda-lib') &&
      fs.existsSync(libraryUrlOrPath)
    ) {
      librariesToRegister.push(libraryUrlOrPath)
    } else {
      try {
        const url = new URL(libraryUrlOrPath)
        const tag = url.hash.substring(1)
        // Remove the hash from the URL:
        if (url.hash === '' || url.hash === '#') {
          throw new AgdaLibraryMissingVersionTag(url)
        } else {
          url.hash = ''
        }
        // Check if the filepath ends in .git:
        if (!url.pathname.endsWith('.git'))
          throw new AgdaLibraryUnsupportedSpecification(libraryUrlOrPath)
        librariesToInstall.push({ url: url.href, tag: tag, distType: 'git' })
      } catch (error) {
        if (error instanceof TypeError)
          throw new AgdaLibraryUnsupportedSpecification(libraryUrlOrPath)
        else throw ensureError(error)
      }
    }
  }

  // Install the requested libraries:
  for (const libraryDist of librariesToInstall) {
    // If the library is a local path, only register it:
    const libraryFile = await installLibrary(libraryDist)
    librariesToRegister.push(libraryFile)
  }

  // Register the requested libraries:
  for (const libraryFile of librariesToRegister) {
    // TODO: This relies on the .agda-lib file having the same name as the library.
    const libraryName = path.basename(libraryFile)
    registerLibrary(libraryFile, defaultLibraries.includes(libraryName))
  }

  // Register executables:
  const executablesToRegister = splitLines(options['agda-executables'])
  for (const executablePath of executablesToRegister) {
    registerExecutable(executablePath)
  }

  // Configure the environment:
  const installBinDir = path.join(installDir, 'bin')
  const installDataDir = path.join(installDir, 'data')
  logger.debug(`Set Agda_datadir to ${installDataDir}`)
  core.exportVariable('Agda_datadir', installDataDir)
  logger.debug(`Add ${installBinDir} to PATH`)
  core.addPath(installBinDir)

  // Set outputs for GitHub Action:
  core.setOutput('agda-data-path', installDataDir)
  core.setOutput('agda-path', installBinDir)
  const installAgdaPath = path.join(
    installBinDir,
    agdaComponents['Agda:exe:agda'].exe
  )
  core.setOutput('agda-exe', installAgdaPath)
  const installAgdaModePath = path.join(
    installBinDir,
    agdaComponents['Agda:exe:agda-mode'].exe
  )
  core.setOutput('agda-mode-exe', installAgdaModePath)
}
