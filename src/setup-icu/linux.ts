import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'

export async function setupForLinux(options: opts.BuildOptions): Promise<void> {
  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
}

export async function bundleForLinux(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const icuinLibDir = await util.pkgConfig('--variable', 'libdir', 'icu-i18n')
  core.info(await util.lsR(icuinLibDir))
  const icuucLibDir = await util.pkgConfig('--variable', 'libdir', 'icu-uc')
  core.info(await util.lsR(icuucLibDir))
  const icuLibPatterns = [icuinLibDir, icuucLibDir]
    .flatMap<string>(libDir =>
      ['libicui18n', 'libicuuc', 'libicudata'].flatMap<string>(libName =>
        path.join(libDir, `${libName}.so.${options['icu-version']}`)
      )
    )
    .join(os.EOL)
  core.info(`Searching with:${os.EOL}${icuLibPatterns}`)
  const icuLibGlobber = await glob.create(icuLibPatterns)
  const icuLibsFrom = await icuLibGlobber.glob()
  core.info(`Found libraries:${os.EOL}${icuLibsFrom.join(os.EOL)}`)

  // core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libFrom of icuLibsFrom) {
    const libName = path.basename(libFrom, `.so.${options['icu-version']}`)
    const libNameTo = `agda-${options['agda-version']}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await util.cp(libFrom, libTo)
    // Change the library ID:
    await util.patchelf('--set-soname', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = util.simver.major(options['icu-version'])
  const libDepsToChange = [
    ['libicui18n', ['libicuuc']],
    ['libicuuc', ['libicudata']]
  ]
  for (const [libName, depNames] of libDepsToChange) {
    const libNameTo = `agda-${options['agda-version']}-${libName}.so`
    const libTo = path.join(distLibDir, libNameTo)
    for (const depName of depNames) {
      const depFrom = `${depName}.so.${icuVerMaj}`
      const depTo = `agda-${options['agda-version']}-${depName}.so`
      await util.patchelf('--replace-needed', depFrom, depTo, libTo)
    }
    await util.patchelf('--add-rpath', "'$ORIGIN'")
  }

  // Change dependencies on Agda executable:
  const agdaBinPath = path.join(distBinDir, util.agdaBinName)
  const binDepsToChange = ['libicui18n', 'libicuuc', 'libicudata']
  for (const depName of binDepsToChange) {
    const depNameFrom = `${depName}.so.${icuVerMaj}`
    const depNameTo = `agda-${options['agda-version']}-${depName}.so`
    await util.patchelf('--replace-needed', depNameFrom, depNameTo, agdaBinPath)
  }
  await util.patchelf('--add-rpath', "'$ORIGIN/../lib'", agdaBinPath)
}
