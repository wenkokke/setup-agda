import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pipeline } from 'node:stream/promises'
import tmp from 'tmp'
import gmpLicense from '../data/licenses/gmp.js'
import icuLicense from '../data/licenses/icu.js'
import zlibLicense from '../data/licenses/zlib.js'
import { agdaInstallDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import cabalPlan from '../util/deps/cabal-plan.js'
import { icuConfigureOptions, icuNeeded } from '../util/deps/icu.js'
import download from '../util/download-helper.js'
import test from './test.js'
import { cpR, ExecOptions, mkdirP } from '../util/exec.js'
import {
  agdaInfo,
  agdaComponents,
  AgdaGitRef,
  BuildOptions,
  Dist,
  isAgdaGitRef,
  isAgdaVersion
} from '../util/types.js'
import ghc from '../util/deps/ghc.js'
import semver from 'semver'
import ensureError from 'ensure-error'
import {
  GhcNotFound,
  GhcVersionConstraintNotFound,
  GhcVersionMismatch
} from '../util/errors.js'

export default async function build(options: BuildOptions): Promise<void> {
  try {
    // Check if the installed GHC version is correct:
    if (isAgdaVersion(options['agda-version'])) {
      const ghcVersionConstraint =
        agdaInfo[options['agda-version']].compatibility?.ghc
      if (ghcVersionConstraint === undefined) {
        logger.warning(
          new GhcVersionConstraintNotFound(options['agda-version'])
        )
      } else {
        const currentGhcVersion = await ghc.maybeGetVersion()
        if (currentGhcVersion === null) {
          throw new GhcNotFound()
        } else {
          if (!semver.satisfies(currentGhcVersion, ghcVersionConstraint)) {
            throw new GhcVersionMismatch(
              options['agda-version'],
              ghcVersionConstraint,
              currentGhcVersion
            )
          }
        }
      }
    }

    // Determine the destination directory:
    const dest = options.dest ?? agdaInstallDir(options['agda-version'])

    // Options for building with ICU:
    if (icuNeeded(options)) options = await icuConfigureOptions(options)

    // Get the source:
    const tmpDir = isAgdaGitRef(options['agda-version'])
      ? await download(agdaGitDist(options['agda-version']))
      : await download(agdaPkgDist(options['agda-version']))

    // Options for running commands in the working directory:
    const execOptions: ExecOptions = { cwd: tmpDir }

    // Update the Cabal package database:
    await cabal(['v2-update'])

    // Configure the build:
    const cabalProjectLocalPath = path.join(tmpDir, 'cabal.project.local')
    if (fs.existsSync(cabalProjectLocalPath))
      logger.warning(`cabal.project already exists`)
    const configureOptions = options['configure-options'].split(/\s+/)
    await cabal(['v2-configure', ...configureOptions], execOptions)

    // Build:
    await cabal(['v2-build', ...Object.keys(agdaComponents)], execOptions)

    // Install executables:
    const destBinDir = path.join(dest, 'bin')
    await mkdirP(destBinDir)
    await cabal(
      [
        'v2-install',
        ...Object.keys(agdaComponents),
        '--install-method=copy',
        `--installdir=${destBinDir}`
      ],
      execOptions
    )

    // Install data files:
    const destDataDir = path.join(dest, 'data')
    await cpR(path.join(tmpDir, 'src', 'data'), destDataDir)

    // Create and install the license report:
    await licenseReport(tmpDir, dest, options)

    // Test:
    await test({
      agdaPath: path.join(destBinDir, agdaComponents['Agda:exe:agda'].exe),
      agdaDataDir: destDataDir
    })
  } catch (error) {
    logger.error(ensureError(error))
  }
}

export function agdaGitDist(agdaVersion: AgdaGitRef): Dist {
  if (agdaVersion === 'HEAD') {
    return {
      url: 'https://github.com/agda/agda.git',
      distType: 'git'
    }
  } else {
    throw Error(`Unsupported Git ref ${agdaVersion}`)
  }
}

/** Get the URL to the source distribution on Hackage. */
export function agdaPkgDist(packageVersion: string): Dist {
  const id = `Agda-${packageVersion}`
  return {
    url: `https://hackage.haskell.org/package/${id}/${id}.tar.gz`,
    dir: id,
    distType: 'tgz'
  }
}

async function licenseReport(
  sourceDir: string,
  dest: string,
  options: BuildOptions
): Promise<void> {
  // Create the license cache directory:
  const licenseCacheDirResult = tmp.dirSync({
    template: `Agda-${options['agda-version']}-licenses-XXXXXX`
  })

  // Write licenses.txt:
  const licensesTxt = path.join(dest, 'licenses.txt')
  const licensesTxtAppendStream = async (rs: fs.ReadStream): Promise<void> =>
    await pipeline(rs, fs.createWriteStream(licensesTxt, { flags: 'a' }))
  const depHeader = (depName: string): string =>
    ['', '-'.repeat(80), '', depName, ''].join(os.EOL)

  // 1. Append the Agda license to $licenseFile:
  const agdaLicensePath = path.join(sourceDir, 'LICENSE')
  await licensesTxtAppendStream(fs.createReadStream(agdaLicensePath))

  // 2. Append the licenses of the Haskell dependencies:
  const cabalPlanLicenses = await cabalPlan.getLicenses(
    options['cabal-plan'] ?? null,
    sourceDir,
    Object.keys(agdaComponents),
    licenseCacheDirResult.name
  )
  for (const [depName, depLicensePath] of Object.entries(cabalPlanLicenses)) {
    assert(depLicensePath !== undefined)
    fs.appendFileSync(licensesTxt, depHeader(depName))
    await licensesTxtAppendStream(fs.createReadStream(depLicensePath))
  }

  // 3. Add the gmp license
  fs.appendFileSync(licensesTxt, depHeader('gmp'))
  fs.appendFileSync(licensesTxt, gmpLicense)

  // 4. Add the icu license
  if (icuNeeded(options)) {
    fs.appendFileSync(licensesTxt, depHeader('icu'))
    fs.appendFileSync(licensesTxt, icuLicense)
  }

  // 5. Add the zlib license
  fs.appendFileSync(licensesTxt, depHeader('zlib'))
  fs.appendFileSync(licensesTxt, zlibLicense)
}
