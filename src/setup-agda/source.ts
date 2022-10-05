import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as config from '../util/config'
import * as path from 'path'
import * as os from 'os'
import {cabal, getCabalVersion} from '../setup-haskell'
import {execOutput} from '../util/exec'

export async function buildAgda(version?: string): Promise<void> {
  const packageName = version === undefined ? 'Agda' : `Agda-${version}`

  // Check if Cabal is available:
  const cabalVersion = await getCabalVersion()
  core.info(`Found Cabal version ${cabalVersion}`)

  // Update the Cabal package list:
  core.info(`Update the Cabal package list`)
  await cabal(['update'])

  // Get the Agda source from Hackage:
  //
  // TODO: fallback to GitHub using the tags in versions?
  //
  core.info(`Get ${packageName} from Hackage`)
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
  const sourceDir = path.dirname(agdaCabalFile)
  const output = await execOutput('ls', ['-R', sourceDir])
  core.info(output)
}
