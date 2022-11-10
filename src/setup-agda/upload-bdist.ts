import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as Mustache from 'mustache'
import * as os from 'node:os'
import * as path from 'node:path'
import pick from 'object.pick'
import * as opts from '../opts'
import * as icu from '../setup-icu'
import setupUpx from '../setup-upx'
import * as util from '../util'

export default async function uploadBdist(
  installDir: string,
  options: opts.BuildOptions
): Promise<string> {
  // Get the name for the distribution:
  const bdistName = renderName(options['bdist-name'], options)
  const bdistDir = path.join(opts.agdaDir(), 'bdist', bdistName)
  await util.mkdirP(bdistDir)

  // Copy binaries & data:
  await util.cpR(path.join(installDir, 'bin'), bdistDir)
  await util.cpR(path.join(installDir, 'data'), bdistDir)

  // Bundle libraries:
  if (options['icu-version'] !== undefined) {
    await icu.bundle(bdistDir, options)
  }

  // Compress binaries:
  if (options['bdist-compress-exe']) {
    try {
      const upxExe = await setupUpx(options)
      for (const binName of util.agdaBinNames)
        await compressBin(upxExe, path.join(bdistDir, 'bin', binName))
    } catch (error) {
      core.info(util.ensureError(error).message)
    }
  }

  // Test artifact:
  await util.agdaTest({
    agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
    agdaDataDir: path.join(bdistDir, 'data')
  })

  // Create file list for artifact:
  const globber = await glob.create(path.join(bdistDir, '**', '*'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const files = await globber.glob()

  // Upload artifact:
  const artifactClient = artifact.create()
  const uploadInfo = await artifactClient.uploadArtifact(
    bdistName,
    files,
    bdistDir,
    {
      continueOnError: true,
      retentionDays: 90
    }
  )

  // Report any errors:
  if (uploadInfo.failedItems.length > 0) {
    core.error(['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL))
  }

  // Return artifact name
  return uploadInfo.artifactName
}

async function compressBin(upxExe: string, binPath: string): Promise<void> {
  // Print the needed libraries before compressing:
  await util.printNeeded(binPath)
  // Compress with UPX:
  await util.getOutput(upxExe, ['--best', binPath])
  // Print the needed libraries after compressing:
  await util.printNeeded(binPath)
}

export function renderName(
  template: string,
  options: opts.BuildOptions
): string {
  return Mustache.render(template, {
    ...pick(options, [
      'agda-version',
      'ghc-version',
      'cabal-version',
      'stack-version',
      'icu-version',
      'upx-version'
    ]),
    arch: os.arch(),
    platform: os.platform(),
    release: os.release()
  })
}
