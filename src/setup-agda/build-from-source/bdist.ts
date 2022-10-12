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
      path.join(bdistDir, 'bin', binName)
    )

  // Copy data:
  await io.cpR(path.join(installDir, 'data'), bdistDir)

  // Bundle libraries:
  await bundleLibs(bdistDir, options)

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

async function printNeededLibs(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.os) {
      case 'linux': {
        output = await exec.execOutput(
          'patchelf',
          ['--print-needed', binPath],
          {silent: true}
        )
        break
      }
      case 'macos': {
        output = await exec.execOutput('otool', ['-L', binPath], {silent: true})
        break
      }
      case 'windows': {
        output = await exec.execOutput('dumpbin', ['/imports', binPath], {
          silent: true
        })
        break
      }
    }
    core.info(`Needed libraries:${os.EOL}${output}`)
  } catch (error) {
    core.debug(
      `Could not print needed dynamic libraries: ${ensureError(error).message}`
    )
  }
}

async function bundleLibs(
  bdistDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      const upx = await setupUpx('3.96')
      for (const binName of agda.agdaBinNames) {
        const binPath = path.join(bdistDir, 'bin', binName)
        // Print the needed libraries before compressing:
        printNeededLibs(binPath)
        // Compress with UPX:
        await exec.exec(upx, ['--best', binPath])
        // Print the needed libraries after compressing:
        printNeededLibs(binPath)
      }
      break
    }
    case 'macos': {
      // If we compiled with --enable-cluster-counting, bundle ICU:
      if (opts.supportsClusterCounting(options)) {
        await io.mkdirP(path.join(bdistDir, 'lib'))
        // Copy needed libraries:
        for (const libPath of options['libs-to-bundle']) {
          await io.cp(
            path.join(libPath),
            path.join(bdistDir, 'lib', path.basename(libPath))
          )
        }
        // Patch run paths for loaded libraries:
        for (const binName of agda.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          const libDirs = new Set<string>()
          // Update run paths for libraries:
          for (const libPath of options['libs-to-bundle']) {
            const libName = path.basename(libPath)
            libDirs.add(path.dirname(libPath))
            await exec.execOutput('install_name_tool', [
              '-change',
              libPath,
              `@rpath/${libName}`,
              binPath
            ])
          }
          // Add load paths for libraries:
          for (const libDir of libDirs) {
            await exec.execOutput('install_name_tool', [
              '-add_rpath',
              '@executable_path',
              '-add_rpath',
              '@executable_path/../lib',
              '-add_rpath',
              libDir,
              binPath
            ])
          }
          // Print the needed libraries:
          printNeededLibs(binPath)
        }
      }
      break
    }
    case 'windows': {
      // If we compiled with --enable-cluster-counting, bundle ICU:
      if (opts.supportsClusterCounting(options)) {
        // Copy needed libraries:
        for (const libPath of options['libs-to-bundle']) {
          await io.cp(
            path.join(libPath),
            path.join(bdistDir, 'bin', path.basename(libPath))
          )
        }
      }
      // Compress with UPX:
      const upx = await setupUpx('3.96')
      for (const binName of agda.agdaBinNames) {
        const binPath = path.join(bdistDir, 'bin', binName)
        // Print the needed libraries before compressing:
        printNeededLibs(binPath)
        // Compress with UPX:
        await exec.exec(upx, ['--best', binPath])
        // Print the needed libraries after compressing:
        printNeededLibs(binPath)
      }
      break
    }
  }
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
