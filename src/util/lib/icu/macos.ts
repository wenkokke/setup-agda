import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as logging from '../../logging'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as opts from '../../../opts'
import assert from 'node:assert'
import {installNameTool} from '../../app/install-name-tool'
import {cp, mkdirP} from '../../exec'
import {brew, brewGetPrefixFor, brewGetVersion} from '../../app/homebrew'
import {
  addPkgConfigPath,
  pkgConfigGetInfo,
  pkgConfigGetVariable,
  pkgConfigGetVersion
} from '../../app/pkg-config'
import ensureError from '../../ensure-error'
import * as simver from '../../simver'

// MacOS

const HOMEBREW_FORMULA = 'icu4c'

export async function setupForMacOS(options: opts.BuildOptions): Promise<void> {
  // Ensure ICU is installed:
  let icuVersion = await brewGetVersion(HOMEBREW_FORMULA)
  logging.info(`Found ICU version: ${icuVersion}`)
  if (icuVersion === undefined) {
    await brew('install', HOMEBREW_FORMULA)
    icuVersion = await brewGetVersion(HOMEBREW_FORMULA)
    logging.info(`Installed ICU version: ${icuVersion}`)
  }
  if (icuVersion === undefined) throw Error('Could not install icu4c')

  // Find the ICU installation location:
  const prefix = fs.realpathSync(await brewGetPrefixFor(HOMEBREW_FORMULA))
  const pkgConfigPattern = path.join(prefix, '**', 'icu-i18n.pc')
  const pkgConfigGlobber = await glob.create(pkgConfigPattern)
  const [pkgConfigFile] = await pkgConfigGlobber.glob()
  if (pkgConfigFile === undefined)
    throw Error(`Could not find icu-i18n.pc in ${prefix}`)
  const pkgConfigDir = path.dirname(pkgConfigFile)
  logging.info(`Found ICU version ${icuVersion} at ${pkgConfigDir}`)
  // Add to PKG_CONFIG_PATH:
  // TODO: set PKG_CONFIG_PATH in options.env rather than the system env
  addPkgConfigPath(pkgConfigDir)

  // Find the ICU version:
  options['icu-version'] = await pkgConfigGetVersion('icu-i18n')
  assert(
    icuVersion === options['icu-version'],
    'ICU version reported by Homebrew differs from ICU version reported by pkg-config'
  )

  // Add extra-{include,lib}-dirs:
  options['extra-include-dirs'].push(
    core.toPlatformPath(await pkgConfigGetVariable('icu-i18n', 'includedir'))
  )
  options['extra-lib-dirs'].push(
    core.toPlatformPath(await pkgConfigGetVariable('icu-i18n', 'libdir'))
  )

  // Print ICU package info:
  try {
    logging.info(JSON.stringify(await pkgConfigGetInfo('icu-i18n')))
  } catch (error) {
    logging.info(ensureError(error).message)
  }
}

export async function bundleForMacOS(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  logging.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await brewGetPrefixFor(HOMEBREW_FORMULA)
  logging.info(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'lib')
  const distBinDir = path.join(distDir, 'bin')

  // Copy library files & change their IDs
  logging.info(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await mkdirP(distLibDir)
  for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
    const libNameFrom = `${libName}.${options['icu-version']}.dylib`
    const libFrom = path.join(prefix, 'lib', libNameFrom)
    const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`
    const libTo = path.join(distLibDir, libNameTo)
    // Copy the library:
    await cp(libFrom, libTo)
    // Change the library ID:
    await installNameTool('-id', libNameTo, libTo)
  }

  // Change internal dependencies between libraries:
  const icuVerMaj = simver.major(options['icu-version'])
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
      await installNameTool('-change', depFrom, depTo, libTo)
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
    await installNameTool('-change', libFrom, libTo, agdaExePath)
  }
}
