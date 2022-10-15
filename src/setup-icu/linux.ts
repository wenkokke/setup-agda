import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from '../opts'
import * as util from '../util'
import assert from 'node:assert'

async function installDirForLinux(icuVersion: string): Promise<string> {
  return path.join(opts.agdaDir(), 'icu', icuVersion)
}

export async function setupForLinux(options: opts.BuildOptions): Promise<void> {
  // Download ICU package:
  const icuVersion = '71.1'
  const icuPkgUrl = opts.findPkgUrl('icu', icuVersion)
  const icuTar = await tc.downloadTool(icuPkgUrl)
  const prefix = await installDirForLinux(icuVersion)
  const tarArgs = ['--extract', '--gzip', '--strip-components=4']
  const prefixTC = await tc.extractTar(icuTar, prefix, tarArgs)
  assert(prefix === prefixTC)

  // Set extra-{include,lib}-dirs
  options['extra-include-dirs'].push(path.join(prefix, 'include'))
  options['extra-lib-dirs'].push(path.join(prefix, 'lib'))

  // Patch prefix in icu-i18n.pc:
  const pkgConfigDir = path.join(prefix, 'lib', 'pkgconfig')
  await util.sed(
    '-i',
    `s/^prefix =.*/prefix = ${prefix.replace(/\//g, '\\/')}/g`,
    path.join(pkgConfigDir, 'icu-i18n.pc')
  )
  await util.sed(
    '-i',
    `s/^prefix =.*/prefix = ${prefix.replace(/\//g, '\\/')}/g`,
    path.join(pkgConfigDir, 'icu-uc.pc')
  )
  // Add to PKG_CONFIG_PATH:
  util.addPkgConfigPath(pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfig('--modversion', 'icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version installed differs from ICU version reported by pkg-config'
  )

  // Print pkg-config information:
  const icuFlagL = await util.pkgConfig('--libs-only-L', 'icu-i18n')
  const icuFlagI = await util.pkgConfig('--cflags-only-I', 'icu-i18n')
  core.info(`Set ICU flags: ${icuFlagI} ${icuFlagL}`)
}

export async function bundleForLinux(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForLinux(options['icu-version'])

  core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
    const libNameFrom = `${libName}.so.${options['icu-version']}`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
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
