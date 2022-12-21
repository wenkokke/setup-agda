import * as core from '@actions/core'
import * as path from 'node:path'
import * as opts from '../../opts'
import * as util from '../../util'
import assert from 'node:assert'

// MacOS

async function installDirForMacOS(): Promise<string> {
  return await util.brew('--prefix', 'icu4c')
}

export async function setupForMacOS(options: opts.BuildOptions): Promise<void> {
  // Ensure ICU is installed:
  let icuVersion = await util.brewGetVersion('icu4c')
  core.info(`Found ICU version: ${icuVersion}`)
  if (icuVersion === undefined) {
    await util.brew('install', 'icu4c')
    icuVersion = await util.brewGetVersion('icu4c')
    core.info(`Installed ICU version: ${icuVersion}`)
  }
  if (icuVersion === undefined) throw Error('Could not install icu4c')

  // Find the ICU installation location:
  const prefix = await installDirForMacOS()
  core.info(`Found ICU version ${icuVersion} at ${prefix}`)

  // Add to PKG_CONFIG_PATH:
  const pkgConfigDir = path.join(prefix, 'lib', 'pkgconfig')
  util.addPkgConfigPath(pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await util.pkgConfigGetVersion('icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version reported by Homebrew differs from ICU version reported by pkg-config'
  )

  // Add extra-{include,lib}-dirs:
  options['extra-include-dirs'].push(
    core.toPlatformPath(
      await util.pkgConfigGetVariable('icu-i18n', 'includedir')
    )
  )
  options['extra-lib-dirs'].push(
    core.toPlatformPath(await util.pkgConfigGetVariable('icu-i18n', 'libdir'))
  )

  // Print ICU package info:
  try {
    core.info(JSON.stringify(await util.pkgConfigGetInfo('icu-i18n')))
  } catch (error) {
    core.info(util.ensureError(error).message)
  }
}

export async function bundleForMacOS(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForMacOS()
  core.info(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  core.info(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
    const libNameFrom = `${libName}.${options['icu-version']}.dylib`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await util.cp(libFrom, libTo)
    // Change the library ID:
    await util.installNameTool('-id', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = util.simver.major(options['icu-version'])
  const libDepsToChange = [
    ['libicui18n', ['libicudata', 'libicuuc']],
    ['libicuuc', ['libicudata']]
  ]
  for (const [libName, depNames] of libDepsToChange) {
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = path.join(distLibDir, libNameTo)
    for (const depName of depNames) {
      const depFrom = `@loader_path/${depName}.${icuVerMaj}.dylib`
      const depTo = `@loader_path/agda-${options['agda-version']}-${depName}.dylib`
      await util.installNameTool('-change', depFrom, depTo, libTo)
    }
  }

  // Change dependencies on Agda executable:
  const agdaExePath = path.join(
    distBinDir,
    opts.agdaComponents['Agda:exe:agda'].exe
  )
  const binDepsToChange = ['libicui18n', 'libicuuc']
  for (const libName of binDepsToChange) {
    const libNameFrom = `${libName}.${options['icu-version']}.dylib`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = `@executable_path/../lib/${libNameTo}`
    await util.installNameTool('-change', libFrom, libTo, agdaExePath)
  }
}
