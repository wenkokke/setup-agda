import * as core from '@actions/core'
import assert from 'node:assert'
import * as path from 'node:path'
import * as opts from './opts'
import buildFromSdist from './setup-agda/build-from-sdist'
import installFromBdist from './setup-agda/install-from-bdist'
import installFromToolCache from './setup-agda/install-from-tool-cache'
import setupAgdaLibrary from './setup-agda-library'
import * as util from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  try {
    // 1. Find an existing Agda build or build from source:
    let agdaDir: string | null = null

    // 1.1. Try the GitHub Tool Cache:
    if (!options['force-build'] && agdaDir === null)
      agdaDir = await core.group(
        `🔍 Searching for Agda ${options['agda-version']} in tool cache`,
        async () => await installFromToolCache(options)
      )

    // 1.2. Try the custom package index:
    if (!options['force-build'] && agdaDir === null)
      agdaDir = await core.group(
        `🔍 Searching for Agda ${options['agda-version']} in package index`,
        async () => await installFromBdist(options)
      )

    // 1.3. Build from source:
    if (!options['force-no-build'] && agdaDir === null)
      agdaDir = await buildFromSdist(options)
    else if (agdaDir === null)
      throw Error('Required build, but "force-no-build" is set.')

    // 2. Set environment variables:
    const installDir = opts.installDir(options['agda-version'])
    await core.group(`🚀 Install Agda ${options['agda-version']}`, async () => {
      assert(
        agdaDir !== null,
        `Variable 'agdaDir' was mutated after build tasks finished. Did you forget an 'await'?`
      )
      if (installDir !== agdaDir) {
        core.info(`Install Agda to ${installDir}`)
        await util.mkdirP(path.dirname(installDir))
        await util.cpR(agdaDir, installDir)
        try {
          await util.rmRF(agdaDir)
        } catch (error) {
          core.info(
            `Failed to clean up build: ${util.ensureError(error).message}`
          )
        }
      }
      await util.configureEnvFor(installDir)
    })

    // 3. Test:
    await core.group(
      '👩🏾‍🔬 Testing Agda installation',
      async () => await util.agdaTest()
    )

    // 4. Setup agda-stdlib & other libraries:
    for (const libraryDist of options['agda-libraries-list-sdist'])
      await setupAgdaLibrary(libraryDist, options)
    for (const libraryFile of options['agda-libraries-list-local']) {
      const libraryName = path.basename(libraryFile, '.agda-lib')
      const isDefault = options['agda-libraries-default'].includes(libraryName)
      util.registerAgdaLibrary(libraryFile, isDefault)
    }
  } catch (error) {
    core.setFailed(util.ensureError(error))
  }
}
