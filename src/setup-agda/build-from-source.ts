import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import assert from 'node:assert'
import ensureError from 'ensure-error'
import * as path from 'node:path'
import * as semver from 'semver'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import setupIcu from '../setup-icu'
import * as util from '../util'
import * as haskell from '../util/haskell'
import * as io from '../util/io'
import * as bdist from '../util/bdist'
import * as cabal from './build-from-source/cabal'
import * as stack from './build-from-source/stack'

export default async function buildFromSource(
  options: opts.BuildOptions
): Promise<string> {
  const {sourceDir, buildTool, requireSetup} = await core.group(
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
      const versions = await ret.buildTool.compatibleGhcVersions(ret.sourceDir)
      assert(
        options['compatible-ghc-versions'].length === 0,
        `Option 'compatible-ghc-versions' is not empty: ${options['compatible-ghc-versions']}`
      )
      options = {...options, 'compatible-ghc-versions': versions}
      core.info(`Found compatible GHC versions: [${versions.join(', ')}]`)
      // Determine whether or not we can use the pre-installed build tools:
      core.info('Search for compatible build tools')
      const maybeOptions = await tryInstalledBuildTools(options)
      if (maybeOptions !== null) {
        core.info('Found compatible versions of GHC and Cabal')
        ret.requireSetup = false
        options = maybeOptions
        return ret as BuildInfo
      } else {
        core.info('Could not find compatible versions of GHC and Cabal')
        ret.requireSetup = true
        options = selectGhcVersion(options)
        return ret as BuildInfo
      }
    }
  )

  // 3. Setup GHC via <haskell/actions/setup>:
  if (requireSetup) {
    core.info('📞 Calling "haskell/actions/setup"')
    options = await setupHaskell(options)
  }

  // 4. Install ICU:
  if (opts.enableClusterCounting(options)) {
    await core.group('🔠 Installing ICU', async () => {
      try {
        options = await setupIcu(options)
      } catch (error) {
        core.info('If this fails, try setting "disable-cluster-counting"')
        throw error
      }
    })
  }

  // 5. Build:
  const agdaDir = opts.installDir(options['agda-version'])
  await core.group('👷🏾‍♀️ Building Agda', async () => {
    await buildTool.build(sourceDir, agdaDir, options)
    await io.cpR(path.join(sourceDir, 'src', 'data'), agdaDir)
  })

  // 6. Test:
  await core.group(
    '👩🏾‍🔬 Testing Agda build',
    async () =>
      await util.testAgda({
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
  compatibleGhcVersions: (sourceDir: string) => Promise<string[]>
}

interface BuildInfo {
  buildTool: BuildTool
  sourceDir: string
  requireSetup: boolean
}

async function tryInstalledBuildTools(
  options: opts.BuildOptions
): Promise<opts.BuildOptions | null> {
  if (options['enable-stack']) {
    // NOTE: GitHub runners do not pre-install Stack
    core.info(`Could not find Stack`)
    return null
  }
  try {
    // Search for pre-installed GHC & Cabal versions:
    const ghcVersion = await haskell.getSystemGhcVersion()
    core.info(`Found pre-installed GHC version ${ghcVersion}`)
    const cabalVersion = await haskell.getSystemCabalVersion()
    core.info(`Found pre-installed Cabal version ${cabalVersion}`)

    // Filter compatible GHC versions to those matching pre-installed version:
    const compatibleGhcVersions = options['compatible-ghc-versions'].filter(
      compatibleGhcVersion =>
        opts.ghcVersionMatch(options, ghcVersion, compatibleGhcVersion)
    )
    if (compatibleGhcVersions.length === 0) {
      core.info(
        `Installed GHC ${ghcVersion} is incompatible with Agda ${options['agda-version']}`
      )
      return null
    }

    // Check if pre-installed GHC version matches 'ghc-version-range':
    if (!semver.satisfies(ghcVersion, options['ghc-version-range'])) {
      core.info(
        `Installed GHC ${ghcVersion} does not satisfy version range ${options['ghc-version-range']}`
      )
      return null
    }

    // Return updated build options
    return {
      ...options,
      'ghc-version': ghcVersion,
      'cabal-version': cabalVersion
    }
  } catch (error) {
    core.debug(`Could not find GHC or Cabal: ${ensureError(error).message}`)
    return null
  }
}

function selectGhcVersion(options: opts.BuildOptions): opts.BuildOptions {
  const ghcVersions = options['compatible-ghc-versions']
  const ghcVersion = semver.maxSatisfying(
    ghcVersions,
    options['ghc-version-range']
  )
  if (ghcVersion === null) {
    throw Error(
      `No compatible GHC versions found: ${options['ghc-version-range']}`
    )
  } else {
    core.info(`Select GHC ${ghcVersion}`)
    return {...options, 'ghc-version': ghcVersion}
  }
}
