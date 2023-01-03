import * as glob from '@actions/glob'
import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import semver from 'semver'
import * as opts from '../opts'
import setupHaskell from '../setup-haskell'
import * as util from '../util'
import licenseReport from './license-report'
import uploadBdist from './upload-bdist'

interface BuildInfo {
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

      // Determine the GHC version:
      const currentGhcVersion = await util.ghcMaybeGetVersion()
      const currentCabalVersion = await util.cabalMaybeGetVersion()
      const selectedGhc = opts.resolveGhcVersion(
        options,
        currentGhcVersion,
        await supportedGhcVersions(sourceDir)
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
      return {
        sourceDir,
        requireSetup,
        matchingGhcVersionsThatCanBuildAgda:
          selectedGhc.matchingVersionsThatCanBuildAgda
      }
    }
  )

  // 3. Install cabal-plan:
  let cabalPlan: string
  if (options['bdist-license-report']) {
    await util.logging.group('🪪 Install cabal-plan', async () => {
      // TODO: this relies on the GitHub runner having a version of GHC and
      //       Cabal available before we call <haskell/actions/setup>
      cabalPlan = await util.cabalPlanSetup(options)
    })
  }

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
  const {sourceDir, matchingGhcVersionsThatCanBuildAgda} = buildInfo
  await util.logging.group('🏗 Building Agda', async () => {
    await build(
      sourceDir,
      installDir,
      options,
      matchingGhcVersionsThatCanBuildAgda
    )
    await util.cpR(path.join(sourceDir, 'src', 'data'), installDir)
  })

  // 7. Generate license report:
  if (options['bdist-license-report']) {
    await util.logging.group('🪪 Generate license report', async () => {
      assert(cabalPlan !== undefined)
      await licenseReport(cabalPlan, sourceDir, installDir, options)
    })
  }

  // 8. Test:
  await util.logging.group('👩🏾‍🔬 Testing Agda build', async () => {
    const agdaExePath = path.join(
      installDir,
      'bin',
      opts.agdaComponents['Agda:exe:agda'].exe
    )
    const agdaDataDir = path.join(installDir, 'data')
    await util.agdaTest({agdaExePath, agdaDataDir})
  })

  // 9. If 'bdist-upload' is specified, upload as a package:
  if (options['bdist-upload']) {
    await util.logging.group('📦 Upload package', async () => {
      const bdistName = await uploadBdist(installDir, options)
      util.logging.info(`Uploaded package as '${bdistName}'`)
    })
  }
  return installDir
}

export const name = 'cabal'

export async function build(
  sourceDir: string,
  installDir: string,
  options: opts.BuildOptions,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  matchingGhcVersionsThatCanBuildAgda: string[]
): Promise<void> {
  const execOptions: util.ExecOptions = {cwd: sourceDir}

  // Run `cabal update`
  await util.cabal(['v2-update'])

  // Run the pre-build hook:
  // We pass the configuration flags to the pre-build hook, so
  // the pre-build hook can call `cabal configure` if desired:
  util.logging.info(`Run pre-build hook`)
  const configFlags = cabalGetConfigFlagsFor(options)
  const preBuildEnv = {
    ...process.env,
    CABAL_CONFIG_FLAGS: configFlags.join(' ')
  }
  await opts.runPreBuildHook(options, {...execOptions, env: preBuildEnv})

  // If no configuration exists, run `cabal configure` with $configFlags:
  if (!fs.existsSync(path.join(sourceDir, 'cabal.project.local'))) {
    util.logging.info(`Configure Agda-${options['agda-version']}`)
    await util.cabal(['v2-configure', ...configFlags], execOptions)
  }

  // Run `cabal build`:
  util.logging.info(`Build Agda-${options['agda-version']}`)
  await util.cabal(['v2-build', 'exe:agda', 'exe:agda-mode'], execOptions)

  // Run `cabal install`:
  util.logging.info(`Install Agda-${options['agda-version']} to ${installDir}`)
  const installBinDir = path.join(installDir, 'bin')
  await util.mkdirP(installBinDir)
  await util.cabal(
    [
      'v2-install',
      'exe:agda',
      'exe:agda-mode',
      '--install-method=copy',
      `--installdir=${installBinDir}`
    ],
    execOptions
  )
}

function cabalGetConfigFlagsFor(options: opts.BuildOptions): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Disable profiling:
  flags.push('--disable-executable-profiling')
  flags.push('--disable-library-profiling')
  // If supported, pass Agda flag --cluster-counting
  if (
    !options['force-no-cluster-counting'] &&
    opts.supportsClusterCounting(options)
  ) {
    flags.push('--flags=+enable-cluster-counting')
  }
  // If supported, pass Agda flag --optimise-heavily
  if (
    !options['force-no-optimise-heavily'] &&
    opts.supportsOptimiseHeavily(options)
  ) {
    flags.push('--flags=+optimise-heavily')
  }
  // If supported, set --split-sections.
  if (opts.supportsSplitSections(options)) {
    flags.push('--enable-split-sections')
  }
  // Add extra-{include,lib}-dirs:
  for (const includeDir of options['extra-include-dirs']) {
    flags.push(`--extra-include-dirs=${includeDir}`)
  }
  for (const libDir of options['extra-lib-dirs']) {
    flags.push(`--extra-lib-dirs=${libDir}`)
  }
  return flags
}

export async function supportedGhcVersions(
  sourceDir: string
): Promise<string[]> {
  const versions: string[] = []
  const cabalFilePath = await findCabalFile(sourceDir)
  const cabalFileContents = fs.readFileSync(cabalFilePath).toString()
  for (const match of cabalFileContents.matchAll(
    /GHC == (?<version>\d+\.\d+\.\d+)/g
  )) {
    if (match.groups !== undefined) {
      if (semver.valid(match.groups.version) !== null) {
        versions.push(match.groups.version)
      } else {
        util.logging.warning(
          `Could not parse GHC version '${match.groups.version}' in: ${cabalFilePath}`
        )
      }
    }
  }
  if (versions.length === 0) {
    throw Error(
      [
        `Could not determine supported GHC versions for building with Cabal:`,
        `${path.basename(cabalFilePath)} does not sepecify 'tested-with'.`
      ].join(os.EOL)
    )
  } else {
    return versions
  }
}

async function findCabalFile(sourceDir: string): Promise<string> {
  const cabalFileGlobber = await glob.create(path.join(sourceDir, '*.cabal'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const cabalFilePaths = await cabalFileGlobber.glob()
  if (cabalFilePaths.length !== 1) {
    throw Error(
      [
        `Found multiple .cabal files:`,
        ...cabalFilePaths.map(cabalFilePath => `- ${cabalFilePath}`)
      ].join(os.EOL)
    )
  } else {
    return cabalFilePaths[0]
  }
}
