import * as artifact from '@actions/artifact'
import * as glob from '@actions/glob'
import * as Mustache from 'mustache'
import * as os from 'node:os'
import * as path from 'node:path'
import pick from 'object.pick'
import * as opts from '../opts'
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

  // Copy licenses.txt:
  if (options['bdist-license-report'])
    await util.cp(path.join(installDir, 'licenses.txt'), bdistDir)

  // Bundle libraries:
  if (options['icu-version'] !== undefined)
    await util.icuBundle(bdistDir, options)

  // Compress binaries:
  if (options['bdist-compress-exe']) {
    try {
      const upxExe = await util.upxSetup(options)
      for (const component of Object.values(opts.agdaComponents))
        await util.getOutput(upxExe, [
          '--best',
          path.join(bdistDir, 'bin', component.exe)
        ])
    } catch (error) {
      util.logging.info(util.ensureError(error).message)
    }
  }

  // Test artifact:
  await util.agdaTest({
    agdaExePath: path.join(
      bdistDir,
      'bin',
      opts.agdaComponents['Agda:exe:agda'].exe
    ),
    agdaDataDir: path.join(bdistDir, 'data')
  })

  // Create file list for artifact:
  const fileGlobber = await glob.create(path.join(bdistDir, '**', '*'), {
    followSymbolicLinks: false,
    implicitDescendants: false,
    matchDirectories: false
  })
  const files = await fileGlobber.glob()

  // Upload artifact:
  const artifactClient = artifact.create()
  const uploadInfo = await artifactClient.uploadArtifact(
    bdistName,
    files,
    bdistDir,
    {
      continueOnError: true,
      retentionDays: parseInt(options['bdist-retention-days'])
    }
  )

  // Report any errors:
  if (uploadInfo.failedItems.length > 0) {
    util.logging.error(
      ['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL)
    )
  }

  // Return artifact name
  return uploadInfo.artifactName
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
