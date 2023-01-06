import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import glob from 'glob'
import install from '../cli/install.js'
import build from '../cli/build.js'
import {
  ActionOptions,
  agdaComponents,
  agdaStdlibInfo,
  Dist,
  pickBuildOptions,
  pickInstallOptions,
  pickSetupHaskellOptions
} from '../util/types.js'
import ensureError from 'ensure-error'
import ghc from '../util/deps/ghc.js'
import setupHaskell from './setup-haskell.js'
import setupCabalPlan from './setup-cabal-plan.js'
import setupIcu from './setup-icu.js'
import { agdaInstallDir } from '../util/appdirs.js'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { icuNeeded } from '../util/deps/icu.js'
import { splitLines } from '../util/lines.js'
import installLibrary from '../cli/install-library.js'
import registerLibrary from '../cli/register-library.js'
import registerExecutable from '../cli/register-executable.js'
import {
  AgdaLibraryMissingVersionTag,
  AgdaLibraryUnsupportedSpecification
} from '../util/errors.js'
import cabalPlan from '../util/deps/cabal-plan.js'

export default async function setupAgda(options: ActionOptions): Promise<void> {
  // Find an existing Agda build or build from source:
  const installDir = agdaInstallDir(options['agda-version'])

  // Try to install & build in order:
  let success = false

  // Try to install Agda from a binary distribution:
  if (!options['force-build'] && !success) {
    logger.group(
      `Install Agda ${options['agda-version']} from prebuilt bundle`,
      async () => {
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
    )
  }

  // Try to install Agda from a source distribution:
  if (!options['force-no-build'] && !success) {
    const buildResult = await logger.group(
      `Build Agda ${options['agda-version']} from source`,
      async () => {
        try {
          // Get build options:
          const buildOptions = await pickBuildOptions(options)

          // Setup ICU if needed:
          if (icuNeeded(buildOptions)) await setupIcu()

          // Get the current GHC version, if any:
          const currentGhcVersion = await ghc.maybeGetVersion()

          // If cabal-plan is needed:
          if (cabalPlan.needed(buildOptions)) {
            // Try to restore it from the cache:
            const cabalPlanCache = await setupCabalPlan.restoreCache()
            if (cabalPlanCache !== null) {
              buildOptions['cabal-plan'] = cabalPlanCache
            } else {
              // Otherwise, if it best to build cabal-plan before we call
              // setup-haskell, do so, and cache it:
              const whenSetupCabalPlan = await setupCabalPlan.when(buildOptions)
              if (whenSetupCabalPlan === 'before-setup-haskell') {
                buildOptions['cabal-plan'] = await setupCabalPlan()
                await setupCabalPlan.saveCache()
              }
            }
          }

          // Call setup-haskell to install the required version of GHC:
          if (currentGhcVersion !== buildOptions['ghc-version']) {
            await setupHaskell(pickSetupHaskellOptions(buildOptions))
            // Set 'setup-haskell' output:
            core.setOutput('setup-haskell', true)
          }

          // If cabal-plan is needed, and we have not yet installed it,
          // we must have deferred it until after calling setup-haskell,
          // so build it now, and cache the result:
          if (
            cabalPlan.needed(buildOptions) &&
            buildOptions['cabal-plan'] === undefined
          ) {
            buildOptions['cabal-plan'] = await setupCabalPlan()
            await setupCabalPlan.saveCache()
          }

          // Run build:
          await build({ ...buildOptions, dest: installDir })
          success = true
          return { buildOptions, installDir }
        } catch (error) {
          logger.error(ensureError(error))
        }
      }
    )

    if (buildResult !== undefined) {
      logger.group(
        `Upload bundle for Agda ${options['agda-version']}`,
        async () => {
          const { buildOptions, installDir } = buildResult
          if (buildOptions['bundle-options'] !== undefined) {
            const bundleOptions = buildOptions['bundle-options']
            const bundleName = await build.renderBundleName(
              bundleOptions['bundle-name'],
              buildOptions
            )
            // Upload bundle:
            const artifactClient = artifact.create()
            const uploadInfo = await artifactClient.uploadArtifact(
              bundleName,
              glob.sync(path.join(installDir, '**')),
              installDir,
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
        }
      )
    }
  }

  // Throw an error if all install methods have failed:
  if (!success) throw Error(`All installation methods have failed`)

  // Setup libraries:
  const librariesToRegister: string[] = []
  const defaultLibraries = splitLines(options['agda-defaults'])
  logger.group(`Install libraries for Agda`, async () => {
    const librariesToInstall: Dist[] = []

    // If 'agda-stdlib-version' was set, add the correct source distribution to
    // the list of libraries to install:
    // TODO: Move special-case treatment of the standard library to install_library
    if (options['agda-stdlib-version'] !== 'none') {
      const agdaStdlibDist =
        agdaStdlibInfo[options['agda-stdlib-version']]?.source
      if (agdaStdlibDist !== undefined) {
        librariesToInstall.push(agdaStdlibDist)
      } else {
        throw Error(
          [
            `Could not find source distribution for`,
            `Agda standard library ${options['agda-stdlib-version']}`
          ].join(' ')
        )
      }
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
          librariesToInstall.push({
            url: url.href,
            tag: tag,
            distType: 'git'
          })
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
  })
  logger.group(`Register libraries with Agda`, async () => {
    // Register the requested libraries:
    for (const libraryFile of librariesToRegister) {
      // TODO: This relies on the .agda-lib file having the same name as the library.
      const libraryName = path.basename(libraryFile, '.agda-lib')
      registerLibrary(libraryFile, defaultLibraries.includes(libraryName))
    }
  })

  // Register executables:
  logger.group(`Register executables with Agda`, async () => {
    const executablesToRegister = splitLines(options['agda-executables'])
    for (const executablePath of executablesToRegister) {
      registerExecutable(executablePath)
    }
  })

  // Configure the environment:
  logger.group(`Configure environment for Agda`, async () => {
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
  })
}
