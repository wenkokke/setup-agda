import Mustache from 'mustache'
import fs from 'node:fs'
import { rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { agdaDir, agdaInstallDir } from '../util/appdirs.js'
import cabal from '../util/deps/cabal.js'
import ghc from '../util/deps/ghc.js'
import { icuBundle } from '../util/deps/icu.js'
import upx from '../util/deps/upx.js'
import { AgdaLicensesNotFound } from '../util/errors.js'
import { cpR, mkdirP, mv } from '../util/exec.js'
import { agdaComponents, BundleOptions } from '../util/types.js'

export default async function bundle(options: BundleOptions): Promise<string> {
  const source = options.source ?? agdaInstallDir(options['agda-version'])
  const bundleName = await bundle.renderName(options['bundle-name'], options)
  const destDir = path.join(agdaDir(), 'bundles', bundleName)

  // Copy binaries & data:
  await mkdirP(destDir)
  await cpR(path.join(source, 'bin'), destDir)
  await cpR(path.join(source, 'data'), destDir)

  // Copy licenses.txt:
  if (options['bundle-license-report']) {
    if (!fs.existsSync(path.join(source, 'licenses.txt')))
      throw new AgdaLicensesNotFound(source)
    await cpR(path.join(source, 'licenses.txt'), destDir)
  }

  // Bundle ICU:
  await icuBundle(destDir, options)

  // Compress binaries:
  if (options['bundle-compress'])
    for (const bin of Object.values(agdaComponents)) {
      const binPath = path.join(destDir, 'bin', bin.exe)
      const bakPath = path.join(destDir, 'bin', `backup-${bin.exe}`)
      await mv(binPath, bakPath)
      await upx(options.upx ?? null, ['--best', '-o', binPath, bakPath])
      await rm(bakPath)
    }

  // Return the path to the bundle:
  return destDir
}

bundle.renderName = async (
  template: string,
  options: BundleOptions
): Promise<string> => {
  const ghcVersion = await ghc.maybeGetVersion()
  const cabalVersion = await cabal.maybeGetVersion()
  return Mustache.render(template, {
    'agda-version': options['agda-version'],
    'ghc-version': ghcVersion,
    'cabal-version': cabalVersion,
    arch: os.arch(),
    platform: os.platform(),
    release: os.release()
  })
}
