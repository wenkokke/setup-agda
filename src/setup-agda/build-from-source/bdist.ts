import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'os'
import * as path from 'path'
import * as opts from '../../opts'
import setupUpx from '../../setup-upx'
import * as agda from '../../util/agda'
import * as exec from '../../util/exec'
import * as haskell from '../../util/haskell'
import * as io from '../../util/io'
import * as mustache from 'mustache'
import pick from 'object.pick'
import ensureError from 'ensure-error'

export default async function uploadBdist(
  installDir: string,
  options: opts.BuildOptions
): Promise<string> {
  // Get the name for the distribution:
  const bdistName = await renderBdistName(options)
  const bdistDir = path.join(agda.agdaDir(), 'bdist', bdistName)
  io.mkdirP(bdistDir)

  // Copy binaries:
  io.mkdirP(path.join(bdistDir, 'bin'))
  for (const binName of agda.agdaBinNames)
    await io.cp(
      path.join(installDir, 'bin', binName),
      path.join(bdistDir, 'bin')
    )

  // Copy data:
  await io.cpR(path.join(installDir, 'data'), bdistDir)

  // Bundle libraries:
  switch (opts.os) {
    case 'linux': {
      const upx = await setupUpx('3.96')
      for (const binName of agda.agdaBinNames) {
        await exec.exec(upx, ['--best', path.join(bdistDir, 'bin', binName)])
      }
      // Print needed libraries:
      try {
        for (const binName of agda.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          await exec.execOutput('patchelf', ['--print-needed', binPath])
        }
      } catch (error) {
        core.debug(ensureError(error).message)
      }
      break
    }
    case 'macos': {
      // Bundle icu-i18n:
      if (opts.supportsClusterCounting(options)) {
        await io.mkdirP(path.join(bdistDir, 'lib'))
        const icuDir = '/usr/local/opt/icu4c/lib'
        // Libraries directly loaded by Agda:
        const libsLoaded = [
          `libicuuc.${options['icu-version']}.dylib`,
          `libicui18n.${options['icu-version']}.dylib`
        ]
        // Libraries needed transitively:
        const libsNeeded = [
          ...libsLoaded,
          `libicudata.${options['icu-version']}.dylib`
        ]
        // Copy needed libraries:
        for (const libName of libsNeeded) {
          await io.cp(
            path.join(icuDir, libName),
            path.join(bdistDir, 'lib', libName)
          )
        }
        // Patch run paths for loaded libraries:
        for (const binName of agda.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          for (const libName of libsLoaded) {
            await exec.execOutput('install_name_tool', [
              '-change',
              path.join('/usr/local/opt/icu4c/lib', libName),
              `@rpath/${libName}`,
              binPath
            ])
            await exec.execOutput('install_name_tool', [
              '-add_rpath',
              '@executable_path',
              '-add_rpath',
              '@executable_path/../lib',
              '-add_rpath',
              icuDir,
              binPath
            ])
          }
        }
        // Print needed libraries:
        try {
          for (const binName of agda.agdaBinNames) {
            const binPath = path.join(bdistDir, 'bin', binName)
            await exec.execOutput('otool', ['-L', binPath])
          }
        } catch (error) {
          core.debug(ensureError(error).message)
        }
      }
      break
    }
    case 'windows': {
      const icuDir = 'C:\\msys64\\mingw64\\bin'
      const libGlobber = await glob.create(path.join(icuDir, 'libicu*.dll'))
      for await (const libPath of libGlobber.globGenerator()) {
        await io.cp(libPath, path.join(bdistDir, 'bin', path.basename(libPath)))
      }
      // Print needed libraries:
      try {
        for (const binName of agda.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          await exec.execOutput('dumpbin', ['/imports', binPath])
        }
      } catch (error) {
        core.debug(ensureError(error).message)
      }
      break
    }
  }

  // Test artifact:
  const agdaPath = path.join(bdistDir, 'bin', agda.agdaBinName)
  const env = {Agda_datadir: path.join(bdistDir, 'data')}
  await agda.testSystemAgda({agdaPath, env})

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

// Utilities for copying files

async function renderBdistName(options: opts.BuildOptions): Promise<string> {
  let template = options['bdist-name']
  if (template !== '')
    template = 'agda-{{agda-version}}-{{ghc-info-target-platform}}'
  const ghcInfo = await haskell.getGhcInfo()
  return mustache.render(template, {
    ...pick(options, [
      'agda-version',
      'ghc-version',
      'cabal-version',
      'stack-version',
      'icu-version',
      'upx-version'
    ]),
    ...pick(process, ['platform', 'arch']),
    ...ghcInfo
  })
}
