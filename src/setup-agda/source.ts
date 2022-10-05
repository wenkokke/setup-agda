import * as core from '@actions/core'
import * as config from '../util/config'
import {cabal, getCabalVersion} from '../setup-haskell'

export async function buildAgda(version: string): Promise<void> {
  // Check if Cabal is available:
  const cabalVersion = await getCabalVersion()
  core.info(`Found Cabal version ${cabalVersion}`)

  // Get the Agda source from Hackage:
  //
  // TODO: fallback to GitHub using the tags in versions?
  //
  core.info(`Get the Agda-${version} source from Hackage`)
  await cabal(['get', `Agda-${version}`, '--destdir', config.cacheDir])
}
