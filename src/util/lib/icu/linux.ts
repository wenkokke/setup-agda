import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../../../opts'
import {patchelf} from '../../app/patchelf'
import {
  pkgConfigGetInfo,
  pkgConfigGetVariable,
  pkgConfigGetVersion
} from '../../app/pkg-config'
import ensureError from '../../ensure-error'
import {cp, mkdirP} from '../../exec'
import * as simver from '../../simver'

export async function setupForLinux(options: opts.BuildOptions): Promise<void> {
  // Find the ICU version:
  options['icu-version'] = await pkgConfigGetVersion('icu-i18n')

  // Add extra-{include,lib}-dirs:
  options['extra-include-dirs'].push(
    core.toPlatformPath(await pkgConfigGetVariable('icu-i18n', 'includedir'))
  )
  options['extra-lib-dirs'].push(
    core.toPlatformPath(await pkgConfigGetVariable('icu-i18n', 'libdir'))
  )

  // Print ICU package info:
  try {
    core.info(JSON.stringify(await pkgConfigGetInfo('icu-i18n')))
  } catch (error) {
    core.info(ensureError(error).message)
  }
}

export async function bundleForLinux(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const libDirsFrom = new Set<string>()
  libDirsFrom.add(await pkgConfigGetVariable('icu-i18n', 'libdir'))
  libDirsFrom.add(await pkgConfigGetVariable('icu-uc', 'libdir'))
  const libFromPatterns = [...libDirsFrom]
    .flatMap<string>(libDir =>
      ['libicui18n', 'libicuuc', 'libicudata'].flatMap<string>(libName =>
        path.join(libDir, `${libName}.so.${options['icu-version']}`)
      )
    )
    .join(os.EOL)
  core.info(`Searching with:${os.EOL}${libFromPatterns}`)
  const libFromGlobber = await glob.create(libFromPatterns)
  const libsFrom = await libFromGlobber.glob()
  core.info(`Found libraries:${os.EOL}${libsFrom.join(os.EOL)}`)

  // core.info(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.info(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await mkdirP(distLibDir)
  for (const libFrom of libsFrom) {
    const icuVersion = options['icu-version'].trim()
    const libName = path.basename(libFrom, `.so.${icuVersion}`)
    const libNameTo = `agda-${options['agda-version']}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await cp(libFrom, libTo)
    // Change the library ID:
    await patchelf('--set-soname', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = simver.major(options['icu-version'])
  const libDepsToChange = [
    ['libicui18n', ['libicuuc']],
    ['libicuuc', ['libicudata']]
  ]
  for (const [libName, depNames] of libDepsToChange) {
    const agdaVersion = options['agda-version'].trim()
    const libNameTo = `agda-${agdaVersion}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    for (const depName of depNames) {
      const depFrom = `${depName}.so.${icuVerMaj}`
      const depTo = `agda-${agdaVersion}-${depName}.so`
      await patchelf('--replace-needed', depFrom, depTo, libTo)
    }
    // NOTE: This overrides any previously set run path.
    await patchelf('--set-rpath', '$ORIGIN', libTo)
  }

  // Change dependencies on Agda executable:
  const agdaExePath = path.join(
    distBinDir,
    opts.agdaComponents['Agda:exe:agda'].exe
  )
  const binDepsToChange = ['libicui18n', 'libicuuc', 'libicudata']
  for (const depName of binDepsToChange) {
    const depNameFrom = `${depName}.so.${icuVerMaj}`
    const depNameTo = `agda-${options['agda-version']}-${depName}.so`
    await patchelf('--replace-needed', depNameFrom, depNameTo, agdaExePath)
  }
  // NOTE: This overrides any previously set run path.
  await patchelf('--set-rpath', '$ORIGIN/../lib', agdaExePath)
}
