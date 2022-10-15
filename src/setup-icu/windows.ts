import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as opts from '../opts'
import * as util from '../util'
import assert from 'node:assert'

// Windows

async function installDirForWindows(icuVersion: string): Promise<string> {
  return path.join(opts.agdaDir(), 'icu', icuVersion)
}

export async function setupForWindows(
  options: opts.BuildOptions
): Promise<void> {
  // Download ICU package:
  const icuVersion = '71.1'
  const icuPkgUrl = opts.findPkgUrl('icu', icuVersion)
  const icuZip = await tc.downloadTool(icuPkgUrl)
  const tmpDir = await tc.extractZip(icuZip)
  const prefix = await installDirForWindows(icuVersion)
  await util.mkdirP(path.dirname(prefix))
  await util.cpR(tmpDir, prefix)
  await util.rmRF(tmpDir)

  // Set extra-{include,lib}-dirs
  options['extra-include-dirs'].push(path.join(prefix, 'include'))
  options['extra-lib-dirs'].push(path.join(prefix, 'bin'))

  // Install pkg-config:
  core.addPath('C:\\msys64\\mingw64\\bin')
  core.addPath('C:\\msys64\\usr\\bin')
  await util.pacman('-v', '--noconfirm', '-Sy', 'mingw-w64-x86_64-pkg-config')

  // Create pkg-config file:
  const pkgConfigDir = path.join(prefix, 'pkgconfig')
  await util.mkdirP(pkgConfigDir)

  // Create icu-i18n.pc
  fs.writeFileSync(
    path.join(pkgConfigDir, 'icu-i18n.pc'),
    [
      `prefix = ${prefix}`,
      `exec_prefix = ${prefix}/bin64`,
      `includedir = ${prefix}/include`,
      `libdir = ${prefix}/bin64`,
      'baselibs = -lpthread -ldl -lm',
      '',
      `Version: ${icuVersion}`,
      `Cflags: -I${prefix}/include`,
      '# end of icu.pc.in',
      'Description: International Components for Unicode: Internationalization library',
      'Name: icu-i18n',
      'Requires: icu-uc',
      'Libs: -licuin'
    ].join(os.EOL)
  )

  // Create icu-uc.pc
  fs.writeFileSync(
    path.join(pkgConfigDir, 'icu-uc.pc'),
    [
      `prefix = ${prefix}`,
      `exec_prefix = ${prefix}/bin64`,
      `includedir = ${prefix}/include`,
      `libdir = ${prefix}/bin64`,
      'baselibs = -lpthread -ldl -lm',
      '',
      `Version: ${icuVersion}`,
      `Cflags: -I${prefix}/include`,
      '# end of icu.pc.in',
      'Description: International Components for Unicode: Common and Data libraries',
      'Name: icu-uc',
      `Libs: -L${prefix}/bin64 -licuuc -licudt`,
      'Libs.private: ${baselibs}'
    ].join(os.EOL)
  )

  // Create icu-io.pc
  fs.writeFileSync(
    path.join(pkgConfigDir, 'icu-io.pc'),
    [
      `prefix = ${prefix}`,
      `exec_prefix = ${prefix}/bin64`,
      `includedir = ${prefix}/include`,
      `libdir = ${prefix}/bin64`,
      'baselibs = -lpthread -ldl -lm',
      '',
      `Version: ${icuVersion}`,
      `Cflags: -I${prefix}/include`,
      '# end of icu.pc.in',
      'Description: International Components for Unicode: Stream and I/O Library',
      'Name: icu-io',
      'Requires: icu-i18n',
      `Libs: -L${prefix}/bin64 -licuio`,
      'Libs.private: ${baselibs}'
    ].join(os.EOL)
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

export async function bundleForWindows(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  if (options['icu-version'] === undefined) throw Error('No ICU version')

  // Gather information
  core.info(`Bundle ICU version ${options['icu-version']}`)
  const prefix = await installDirForWindows(options['icu-version'])
  core.debug(`Found ICU version ${options['icu-version']} at ${prefix}`)
  const distLibDir = path.join(distDir, 'bin')
  const icuVerMaj = util.simver.major(options['icu-version'])

  // Copy library files
  core.debug(`Copy ICU ${options['icu-version']} in ${distLibDir}`)
  await util.mkdirP(distLibDir)
  for (const libName of ['libicuin', 'libicuuc', 'libicudt']) {
    const libFullName = `${libName}${icuVerMaj}.dll`
    const libFrom = path.join(prefix, 'bin64', libFullName)
    const libTo = path.join(distLibDir, libFullName)
    // Copy the library:
    await util.cp(libFrom, libTo)
  }
}
