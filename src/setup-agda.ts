import assert from 'node:assert'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from './opts'
import setupAgdaLibrary from './setup-agda-library'
import buildFromSdist from './setup-agda/build-from-sdist'
import installFromBdist from './setup-agda/install-from-bdist'
import * as util from './util'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  // 1. Find an existing Agda build or build from source:
  let agdaDir: string | null = null

  // 1.1. Try the custom package index:
  if (!options['force-build'] && agdaDir === null)
    agdaDir = await util.logging.group(
      `🔍 Searching for Agda ${options['agda-version']} in package index`,
      async () => await installFromBdist(options)
    )

  // 1.2. Build from source:
  if (!options['force-no-build'] && agdaDir === null)
    agdaDir = await buildFromSdist(options)
  else if (agdaDir === null)
    throw Error('Required build, but "force-no-build" is set.')

  // 2. Set environment variables:
  const installDir = opts.agdaInstallDir(options['agda-version'])
  await util.logging.group(
    `🚀 Install Agda ${options['agda-version']}`,
    async () => {
      assert(
        agdaDir !== null,
        `Variable 'agdaDir' was mutated after build tasks finished. Did you forget an 'await'?`
      )
      if (installDir !== agdaDir) {
        util.logging.info(`Install Agda to ${installDir}`)
        await util.mkdirP(path.dirname(installDir))
        await util.cpR(agdaDir, installDir)
        try {
          await util.rmRF(agdaDir)
        } catch (error) {
          util.logging.info(
            `Failed to clean up build: ${util.ensureError(error).message}`
          )
        }
      }
      await util.configureEnvFor(installDir)
    }
  )

  // 3. Test:
  await util.logging.group(
    '👩🏾‍🔬 Testing Agda installation',
    async () => await util.agdaTest()
  )

  // 4. Install libraries & register executables:
  await util.logging.group(
    '📚 Installing libraries & registering executables',
    async () => {
      // Install libraries from sdist:
      for (const libraryDist of options['agda-libraries-list-sdist']) {
        await setupAgdaLibrary(libraryDist, options)
      }
      // Register local libraries:
      for (const libraryFile of options['agda-libraries-list-local']) {
        const libraryName = path.basename(libraryFile, '.agda-lib')
        const isDefault =
          options['agda-libraries-default'].includes(libraryName)
        util.registerAgdaLibrary(libraryFile, isDefault)
      }
      // Register local executables:
      for (const executable of options['agda-executables-list']) {
        util.registerAgdaExecutable(executable)
      }
      // Print final register:
      const libraries = util.readLibrariesSync()
      util.logging.info(
        [
          'libraries:',
          ...libraries.map(parsedPath => path.format(parsedPath))
        ].join(os.EOL)
      )
      const defaults = util.readDefaultsSync()
      util.logging.info(['defaults:', ...defaults].join(os.EOL))
      const executables = util.readExecutablesSync()
      util.logging.info(['executables:', ...executables].join(os.EOL))
    }
  )
}
