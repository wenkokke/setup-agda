import * as core from '@actions/core'
import * as path from 'node:path'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import * as icu from '../setup-icu'
import * as util from '../util'
import * as cabal from './build-from-sdist/cabal'
import * as stack from './build-from-sdist/stack'
import uploadBdist from './upload-bdist'

interface BuildTool {
  name: string
  build: (
    sourceDir: string,
    installDir: string,
    options: opts.BuildOptions,
    matchingGhcVersionsThatCanBuildAgda: string[]
  ) => Promise<void>
  supportedGhcVersions: (sourceDir: string) => Promise<string[]>
}

interface BuildInfo {
  buildTool: BuildTool
  sourceDir: string
  requireSetup: boolean
  matchingGhcVersionsThatCanBuildAgda: string[]
}

export default async function buildFromSource(
  options: opts.BuildOptions
): Promise<string | null> {
  // If 'agda-version' is 'nightly' we must install from bdist:
  if (options['agda-version'] === 'nightly') return null

  const buildInfo = await core.group(
    '🛠 Preparing to build Agda from source',
    async (): Promise<BuildInfo> => {
      // Download the source:
      core.info('Download source distribution')
      const sourceDir = await util.getAgdaSdist(options)
      core.info(`Downloaded source distribution to ${sourceDir}`)

      // Determine the build tool:
      const buildTool = options['enable-stack'] ? stack : cabal
      core.info(`Set build tool to ${buildTool.name}`)

      // Determine the GHC version:
      const currentGhcVersion = await util.ghcMaybeGetVersion()
      const currentCabalVersion = await util.cabalMaybeGetVersion()
      const selectedGhc = opts.resolveGhcVersion(
        options,
        currentGhcVersion,
        await buildTool.supportedGhcVersions(sourceDir)
      )
      options['ghc-version'] = selectedGhc.version

      // Determine whether or not we can use the pre-installed build tools:
      let requireSetup = false
      if (
        options['ghc-version'] !== 'recommended' &&
        options['ghc-version'] !== 'latest' &&
        options['ghc-version'] !== currentGhcVersion
      ) {
        core.info(
          `Building with specified options requires a different GHC version`
        )
        requireSetup = true
      }
      if (
        options['cabal-version'] !== 'latest' &&
        options['cabal-version'] !== currentCabalVersion
      ) {
        core.info(
          `Building with specified options requires a different Cabal version`
        )
        requireSetup = true
      }
      if (options['enable-stack']) {
        core.info(`Building with specified options requires Stack`)
        requireSetup = true
      }
      return {
        sourceDir,
        buildTool,
        requireSetup,
        matchingGhcVersionsThatCanBuildAgda:
          selectedGhc.matchingVersionsThatCanBuildAgda
      }
    }
  )

  // 3. Setup GHC via <haskell/actions/setup>:
  if (buildInfo.requireSetup) {
    core.info('📞 Calling "haskell/actions/setup"')
    await setupHaskell(options)
  }

  // 4. Install ICU:
  if (opts.needsIcu(options)) {
    await core.group('🔠 Installing ICU', async () => {
      try {
        await icu.setup(options)
      } catch (error) {
        core.info('If this fails, try setting "disable-cluster-counting"')
        throw error
      }
    })
  }

  // 5. Build:
  const agdaDir = opts.installDir(options['agda-version'])
  await core.group('🏗 Building Agda', async () => {
    const {buildTool, sourceDir, matchingGhcVersionsThatCanBuildAgda} =
      buildInfo
    await buildTool.build(
      sourceDir,
      agdaDir,
      options,
      matchingGhcVersionsThatCanBuildAgda
    )
    await util.cpR(path.join(sourceDir, 'src', 'data'), agdaDir)
  })

  // 6. Test:
  await core.group(
    '👩🏾‍🔬 Testing Agda build',
    async () =>
      await util.agdaTest({
        agdaBin: path.join(agdaDir, 'bin', util.agdaBinName),
        agdaDataDir: path.join(agdaDir, 'data')
      })
  )

  // 7. If 'bdist-upload' is specified, upload as a package:
  if (options['bdist-upload']) {
    await core.group('📦 Upload package', async () => {
      const bdistName = await uploadBdist(agdaDir, options)
      core.info(`Uploaded package as '${bdistName}'`)
    })
  }
  return agdaDir
}
