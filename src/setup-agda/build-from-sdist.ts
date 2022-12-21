import * as path from 'node:path'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import * as util from '../util'
import * as cabal from './build-from-sdist/cabal'
import * as stack from './build-from-sdist/stack'
import licenseReport from './license-report'
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

  const buildInfo = await util.logging.group(
    '🛠 Preparing to build Agda from source',
    async (): Promise<BuildInfo> => {
      // Download the source:
      util.logging.info('Download source distribution')
      const sourceDir = await util.getAgdaSdist(options)
      util.logging.info(`Downloaded source distribution to ${sourceDir}`)

      // Determine the build tool:
      const buildTool = options['enable-stack'] ? stack : cabal
      util.logging.info(`Set build tool to ${buildTool.name}`)

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
        util.logging.info(
          `Building with specified options requires a different GHC version`
        )
        requireSetup = true
      }
      if (
        options['cabal-version'] !== 'latest' &&
        options['cabal-version'] !== currentCabalVersion
      ) {
        util.logging.info(
          `Building with specified options requires a different Cabal version`
        )
        requireSetup = true
      }
      if (options['enable-stack']) {
        util.logging.info(`Building with specified options requires Stack`)
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
    util.logging.info('📞 Calling "haskell/actions/setup"')
    await setupHaskell(options)
  }

  // 4. Install ICU:
  if (opts.needsIcu(options)) {
    await util.logging.group('🔠 Installing ICU', async () => {
      try {
        await util.icuSetup(options)
      } catch (error) {
        util.logging.info(
          'If this fails, try setting "disable-cluster-counting"'
        )
        throw error
      }
    })
  }

  // 5. Build:
  const installDir = opts.agdaInstallDir(options['agda-version'])
  const {buildTool, sourceDir, matchingGhcVersionsThatCanBuildAgda} = buildInfo
  await util.logging.group('🏗 Building Agda', async () => {
    await buildTool.build(
      sourceDir,
      installDir,
      options,
      matchingGhcVersionsThatCanBuildAgda
    )
    await util.cpR(path.join(sourceDir, 'src', 'data'), installDir)
  })

  // 6. Generate license report:
  if (options['bdist-license-report']) {
    await util.logging.group('🪪 Generate license report', async () => {
      // Install cabal-plan:
      const cabalPlan = await util.cabalPlanSetup(options)
      // Generate license report:
      await licenseReport(cabalPlan, sourceDir, installDir, options)
    })
  }

  // 7. Test:
  await util.logging.group('👩🏾‍🔬 Testing Agda build', async () => {
    const agdaExePath = path.join(
      installDir,
      'bin',
      opts.agdaComponents['Agda:exe:agda'].exe
    )
    const agdaDataDir = path.join(installDir, 'data')
    await util.agdaTest({agdaExePath, agdaDataDir})
  })

  // 8. If 'bdist-upload' is specified, upload as a package:
  if (options['bdist-upload']) {
    await util.logging.group('📦 Upload package', async () => {
      const bdistName = await uploadBdist(installDir, options)
      util.logging.info(`Uploaded package as '${bdistName}'`)
    })
  }
  return installDir
}
