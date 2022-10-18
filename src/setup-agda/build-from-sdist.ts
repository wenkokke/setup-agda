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
    options: opts.BuildOptions
  ) => Promise<void>
  supportedGhcVersions: (sourceDir: string) => Promise<string[]>
}

interface BuildInfo {
  buildTool: BuildTool
  sourceDir: string
  requireSetup: boolean
}

export default async function buildFromSource(
  options: opts.BuildOptions
): Promise<string> {
  const buildInfo = await core.group(
    '🛠 Preparing to build Agda from source',
    async (): Promise<BuildInfo> => {
      const ret: Partial<BuildInfo> = {}
      // Download the source:
      core.info('Download source distribution from Hackage')
      ret.sourceDir = await util.getAgdaSource(options)
      core.debug(`Downloaded source distribution to ${ret.sourceDir}`)

      // Determine the build tool:
      ret.buildTool = options['enable-stack'] ? stack : cabal
      core.info(`Set build tool to ${ret.buildTool.name}`)

      // Determine the GHC version:
      const currentGhcVersion = await util.ghcMaybeGetVersion()
      const currentCabalVersion = await util.cabalMaybeGetVersion()
      options['ghc-version'] = opts.resolveGhcVersion(
        options,
        currentGhcVersion,
        await ret.buildTool.supportedGhcVersions(ret.sourceDir)
      )

      // Determine whether or not we can use the pre-installed build tools:
      core.info('Search for compatible build tools')
      const requireSetup =
        // Require different GHC version:
        (options['ghc-version'] !== 'recommended' &&
          options['ghc-version'] !== 'latest' &&
          options['ghc-version'] !== currentGhcVersion) ||
        // Require different Cabal version:
        (options['cabal-version'] !== 'latest' &&
          options['cabal-version'] !== currentCabalVersion) ||
        // Require Stack:
        options['enable-stack']
      if (requireSetup) {
        core.info('Could not find supported versions of GHC and Cabal')
        return ret as BuildInfo
      } else {
        core.info('Found supported versions of GHC and Cabal')
        return ret as BuildInfo
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
    const {buildTool, sourceDir} = buildInfo
    await buildTool.build(sourceDir, agdaDir, options)
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
