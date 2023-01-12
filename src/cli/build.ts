import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { pipeline } from 'node:stream/promises'
import tmp from 'tmp'
import bundledLicenses from '../data/licenses.json'
import { agdaInstallDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import cabalPlan from '../util/deps/cabal-plan.js'
import {
  icuBundle,
  icuConfigureOptions,
  icuGetVersion,
  icuNeeded
} from '../util/deps/icu.js'
import download from '../util/download-helper.js'
import test from './test.js'
import { cpR, ExecOptions, mkdirP, mv } from '../util/exec.js'
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
import {
  GhcNotFound,
  GhcVersionConstraintNotFound,
  GhcVersionMismatch
} from '../util/errors.js'
import upx from '../util/deps/upx.js'
import { rm } from 'node:fs/promises'
import Mustache from 'mustache'
import { arch, platform, release } from '../util/platform.js'
import ensureError from 'ensure-error'

export default async function build(options: BuildOptions): Promise<void> {
  // Check if the installed GHC version is correct:
  if (isAgdaVersion(options['agda-version'])) {
    const ghcVersionConstraint =
      agdaInfo[options['agda-version']].compatibility?.ghc
    if (ghcVersionConstraint === undefined) {
      logger.warning(new GhcVersionConstraintNotFound(options['agda-version']))
    } else {
      const currentGhcVersion = await ghc.maybeGetVersion()
      if (currentGhcVersion === null) {
        throw new GhcNotFound(
          'Agda',
          options['agda-version'],
          ghcVersionConstraint
        )
      } else {
        if (!semver.satisfies(currentGhcVersion, ghcVersionConstraint)) {
          throw new GhcVersionMismatch(
            'Agda',
            options['agda-version'],
            ghcVersionConstraint,
            currentGhcVersion
          )
        }
      }
    }
  }

  // Determine the destination directory:
  const destDir = options.dest ?? agdaInstallDir(options['agda-version'])

  // Options for building with ICU:
  if (icuNeeded(options)) {
    options = await icuConfigureOptions(options)
  }

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
  const destBinDir = path.join(destDir, 'bin')
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
  const destDataDir = path.join(destDir, 'data')
  await cpR(path.join(tmpDir, 'src', 'data'), destDataDir)

  // Create the license report:
  if (options['bundle-options']?.['bundle-license-report']) {
    await licenseReport(tmpDir, destDir, options)
  }

  // Bundle ICU on Windows:
  //
  // NOTE: We don't add MSYS to the global PATH on Windows,
  //       so after the build Agda can no longer find the ICU DLLs.
  //       As a fix, we also bundle ICU with Agda for the local build.
  //
  if (icuNeeded(options) && platform === 'windows') {
    await icuBundle(destDir, options)
  }

  // Bundle:
  if (options['bundle-options'] !== undefined) {
    const bundleOptions = options['bundle-options']

    // Bundle ICU on Linux and macOS (see above for Windows):
    if (icuNeeded(options) && platform !== 'windows') {
      await icuBundle(destDir, options)
    }

    // Compress binaries:
    if (bundleOptions['bundle-compress']) {
      for (const bin of Object.values(agdaComponents)) {
        const binPath = path.join(destDir, 'bin', bin.exe)
        const bakPath = path.join(destDir, 'bin', `backup-${bin.exe}`)
        await mv(binPath, bakPath)
        await upx(bundleOptions.upx ?? null, ['--best', '-o', binPath, bakPath])
        await rm(bakPath)
      }
    }
  }

  // Test:
  await test({
    agdaPath: path.join(destBinDir, agdaComponents['Agda:exe:agda'].exe),
    agdaDataDir: destDataDir
  })
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
  // TODO: If the gmp license varies by version, we need to detect the
  //       gmp version and adjust the license accordingly
  fs.appendFileSync(licensesTxt, depHeader('gmp'))
  fs.appendFileSync(licensesTxt, bundledLicenses.licenses.gmp)

  // 4. Add the ICU license
  // TODO: If the icu license varies by version, we need to detect the
  //       icu version and adjust the license accordingly
  if (icuNeeded(options)) {
    fs.appendFileSync(licensesTxt, depHeader('icu'))
    fs.appendFileSync(licensesTxt, bundledLicenses.licenses.icu)
  }

  // 5. Add the zlib license
  // TODO: If the zlib license varies by version, we need to detect the
  //       zlib version and adjust the license accordingly
  fs.appendFileSync(licensesTxt, depHeader('zlib'))
  fs.appendFileSync(licensesTxt, bundledLicenses.licenses.zlib)
}

build.renderBundleName = async (
  template: string,
  options: BuildOptions
): Promise<string> => {
  // Get the GHC and Cabal versions:
  const ghcVersion = await ghc.maybeGetVersion()
  const cabalVersion = await cabal.maybeGetVersion()
  // Get the ICU version:
  let icuVersion = null
  if (icuNeeded(options)) {
    try {
      icuVersion = await icuGetVersion()
    } catch (error) {
      logger.warning(ensureError(error))
    }
  }
  return Mustache.render(template, {
    'agda-version': options['agda-version'],
    'ghc-version': ghcVersion,
    'cabal-version': cabalVersion,
    'icu-version': icuVersion,
    arch,
    platform,
    release
  })
}
