import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as config from '../util/config'
import * as path from 'path'
import * as os from 'os'
import * as semver from 'semver'
import setupHaskell from 'setup-haskell'
import {
  cabal,
  getCabalVersion,
  getGHCVersionsTestedWith as getGhcVersionsTestedWith
} from '../util/haskell'

export async function buildAgda(
  agdaVersion: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): Promise<void> {
  // Check if Cabal is available:
  const cabalVersion = await getCabalVersion()
  core.info(`Found Cabal version ${cabalVersion}`)

  // Update the Cabal package list:
  core.info(`Update the Cabal package list`)
  await cabal(['update'])

  // Get the Agda source from Hackage:
  core.info(`Get Agda ${agdaVersion} from Hackage`)
  const sourceDir = await cabalGetAgda(agdaVersion)
  const agdaCabalFile = path.join(sourceDir, 'Agda.cabal')

  // Select compatible GHC versions:
  const ghcVersion = await selectGHCVersion(agdaVersion, agdaCabalFile, options)
  core.info(`Selected GHC version ${ghcVersion}`)

  // Setup GHC via haskell/actions/setup
  await setupHaskell({
    'ghc-version': ghcVersion,
    // NOTE:
    //   haskell/actions/setup reads action.yml from __dirname/../action.yml
    //   which resolves to wenkokke/setup-agda/action.yml if used as a library.
    //   haskell/actions/setup reads default values for:
    //   - ghc-version
    //   - cabal-version
    //   - stack-version
    //   As these are undefined, this throws the following error:
    //
    //   Error: Cannot read properties of undefined (reading 'default')
    //
    //   As a workaround, we pass these options to haskell/actions/setup.
    //   We choose to set cabal-version to whichever version is installed.
    //   We set stack-version to latest, as enable-stack defaults to false.
    'cabal-version': cabalVersion,
    'stack-version': 'latest'
  })
}

async function selectGHCVersion(
  agdaVersion: string,
  agdaCabalFile: string,
  options?: {
    ghcVersion?: string | semver.Range
  }
): Promise<string> {
  // Get all compatible GHC versions from Agda.cabal
  const compatibleGhcVersions = getGhcVersionsTestedWith(agdaCabalFile)
  core.info(
    [
      `Agda version ${agdaVersion} is compatible with GHC versions:`,
      compatibleGhcVersions.map(ghcVersion => ghcVersion.version).join(', ')
    ].join(os.EOL)
  )
  // Compute the latest satisying GHC version
  const ghcVersion = semver.maxSatisfying(
    compatibleGhcVersions,
    options?.ghcVersion ?? '*'
  )
  if (ghcVersion === null) {
    throw Error(`Could not find compatible GHC version`)
  } else {
    return ghcVersion.version
  }
}

async function cabalGetAgda(version: string): Promise<string> {
  const packageName = version === 'latest' ? 'Agda' : `Agda-${version}`
  await cabal(['get', packageName, '--destdir', config.cacheDir])
  const agdaCabalGlobber = await glob.create(
    path.join(config.cacheDir, 'Agda-*', 'Agda.cabal')
  )
  const agdaCabalFiles = await agdaCabalGlobber.glob()
  if (agdaCabalFiles.length !== 1) {
    throw Error(
      agdaCabalFiles.length === 0
        ? 'Could not find Agda source distribution'
        : ['Found multiple Agda source distributions:', agdaCabalFiles].join(
            os.EOL
          )
    )
  }
  const [agdaCabalFile] = agdaCabalFiles
  return path.dirname(agdaCabalFile)
}
