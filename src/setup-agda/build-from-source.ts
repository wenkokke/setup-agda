import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import assert from 'node:assert'
import ensureError from 'ensure-error'
import * as path from 'node:path'
import * as semver from 'semver'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import * as icu from '../setup-icu'
import * as util from '../util'
import * as bdist from './bdist'
import * as cabal from './build-from-source/cabal'
import * as stack from './build-from-source/stack'

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

      // Determine the compatible GHC versions:
      assert(
        options['ghc-supported-versions'].length === 0,
        `Option 'ghc-supported-versions' is not empty: ${options['ghc-supported-versions']}`
      )
      options['ghc-supported-versions'] =
        await ret.buildTool.supportedGhcVersions(ret.sourceDir)
      core.info(`Supported GHC versions: ${options['ghc-supported-versions']}`)
      // Determine whether or not we can use the pre-installed build tools:
      core.info('Search for compatible build tools')
      ret.requireSetup = await requireSetup(options)
      if (ret.requireSetup) {
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
  if (opts.supportsClusterCounting(options)) {
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
  await core.group('👷🏾‍♀️ Building Agda', async () => {
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

  // 7. Store in Tool Cache:
  const agdaDirTC = await core.group(
    '🗄 Caching Agda build in tool cache',
    async () => {
      return await tc.cacheDir(agdaDir, 'agda', options['agda-version'])
    }
  )

  // 8. If 'bdist-upload' is specified, upload as a binary distribution:
  if (options['bdist-upload']) {
    await core.group('📦 Upload binary distribution', async () => {
      const bdistName = await bdist.upload(agdaDir, options)
      core.info(`Uploaded binary distribution as '${bdistName}'`)
    })
  }
  return agdaDirTC
}

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

async function requireSetup(options: opts.BuildOptions): Promise<boolean> {
  if (options['enable-stack']) {
    // NOTE: GitHub runners do not pre-install Stack
    core.info(`Could not find Stack`)
    return true
  }
  try {
    // Search for pre-installed GHC & Cabal versions:
    const ghcVersion = await util.ghcGetVersion()
    core.info(`Found pre-installed GHC version ${ghcVersion}`)
    const cabalVersion = await util.cabalGetVersion()
    core.info(`Found pre-installed Cabal version ${cabalVersion}`)

    // Filter compatible GHC versions to those matching pre-installed version:
    const compatibleGhcVersions = options['ghc-supported-versions'].filter(
      compatibleGhcVersion =>
        opts.ghcVersionMatch(options, ghcVersion, compatibleGhcVersion)
    )
    if (compatibleGhcVersions.length === 0) {
      core.info(
        `Installed GHC ${ghcVersion} is incompatible with Agda ${options['agda-version']}`
      )
      return true
    }

    // Check if pre-installed GHC version matches 'ghc-version-range':
    if (!semver.satisfies(ghcVersion, options['ghc-version-range'])) {
      core.info(
        `Installed GHC ${ghcVersion} does not satisfy version range ${options['ghc-version-range']}`
      )
      return true
    }

    // Return updated build options
    options['ghc-version'] = ghcVersion
    options['cabal-version'] = cabalVersion
    return false
  } catch (error) {
    core.debug(`Could not find GHC or Cabal: ${ensureError(error).message}`)
    return true
  }
}
