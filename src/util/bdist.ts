import * as artifact from '@actions/artifact'
import * as tc from '@actions/tool-cache'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../opts'
import setupUpx from '../setup-upx'
import * as util from '../util'
import * as exec from './exec'
import * as haskell from './haskell'
import * as io from './io'
import * as mustache from 'mustache'
import pick from 'object.pick'
import ensureError from 'ensure-error'
import assert from 'node:assert'

export async function download(
  options: opts.BuildOptions
): Promise<string | null> {
  // Get the name for the distribution:
  options = {...options, 'bdist-name': ''}
  const bdistName = await renderBdistName(options)
  const bdistUrl = opts.bdistIndex[bdistName]
  if (bdistUrl !== undefined) {
    try {
      core.info(`Download package ${bdistName} from ${bdistUrl}`)
      return await tc.downloadTool(bdistUrl)
    } catch (error) {
      core.warning(
        `Failed to download package ${bdistName}: ${ensureError(error).message}`
      )
      return null
    }
  } else {
    core.info(`Could not find package ${bdistName}`)
    return null
  }
}

export async function upload(
  installDir: string,
  options: opts.BuildOptions
): Promise<string> {
  // Get the name for the distribution:
  const bdistName = await renderBdistName(options)
  const bdistDir = path.join(opts.agdaDir(), 'bdist', bdistName)
  io.mkdirP(bdistDir)

  // Copy binaries:
  io.mkdirP(path.join(bdistDir, 'bin'))
  for (const binName of util.agdaBinNames)
    await io.cp(
      path.join(installDir, 'bin', binName),
      path.join(bdistDir, 'bin', binName)
    )

  // Copy data:
  await io.cpR(path.join(installDir, 'data'), bdistDir)

  // Bundle libraries:
  await bundleLibs(bdistDir, options)

  // Test artifact:
  await util.testAgda({
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

async function bundleLibs(
  bdistDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      const upx = await setupUpx('3.96')
      for (const binName of util.agdaBinNames) {
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
      if (opts.enableClusterCounting(options)) {
        await io.mkdirP(path.join(bdistDir, 'lib'))
        // Copy needed libraries:
        for (const libPath of options['libs-to-bundle']) {
          await io.cp(
            path.join(libPath),
            path.join(bdistDir, 'lib', path.basename(libPath))
          )
        }
        // Patch run paths for loaded libraries:
        for (const binName of util.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          const libDirs = new Set<string>()
          // Print the needed libraries:
          printNeededLibs(binPath)
          // Update run paths for libraries:
          for (const libPath of options['libs-to-bundle']) {
            const libName = path.basename(libPath)
            libDirs.add(path.dirname(libPath))
            await changeDependency(binPath, libPath, `@rpath/${libName}`)
          }
          // Add load paths for libraries:
          await addRunPaths(
            binPath,
            '@executable_path',
            '@executable_path/../lib',
            ...libDirs
          )
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
      for (const binName of util.agdaBinNames) {
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

async function printNeededLibs(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.os) {
      case 'linux': {
        output = await exec.getoutput('patchelf', ['--print-needed', binPath], {
          silent: true
        })
        break
      }
      case 'macos': {
        output = await exec.getoutput('otool', ['-L', binPath], {silent: true})
        break
      }
      case 'windows': {
        output = await exec.getoutput('dumpbin', ['/imports', binPath], {
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

async function changeDependency(
  bin: string,
  from: string,
  to: string
): Promise<void> {
  assert(opts.os === 'macos', `Cannot run "install_name_tool" on ${opts.os}`)
  await exec.getoutput('install_name_tool', ['-change', from, to, bin])
}

async function addRunPaths(bin: string, ...rpaths: string[]): Promise<void> {
  assert(opts.os === 'macos', `Cannot run "install_name_tool" on ${opts.os}`)
  const args = rpaths.flatMap<string>(rpath => ['-add_rpath', rpath])
  await exec.getoutput('install_name_tool', [...args, bin])
}

async function renderBdistName(options: opts.BuildOptions): Promise<string> {
  let template = options['bdist-name']
  if (template !== '') template = 'agda-{{agda-version}}-{{arch}}-{{platform}}'
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
    ...pick(process, ['arch', 'platform']),
    ...{release: os.release()},
    ...ghcInfo
  })
}
