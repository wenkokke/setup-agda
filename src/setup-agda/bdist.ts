import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as Mustache from 'mustache'
import * as os from 'node:os'
import * as path from 'node:path'
import pick from 'object.pick'
import * as opts from '../opts'
import setupUpx from '../setup-upx'
import * as util from '../util'

export async function download(
  options: opts.BuildOptions
): Promise<string | null> {
  // Get the name for the distribution:
  const bdistName = renderName('', options)
  const bdistUrl = opts.bdistIndex[bdistName]
  if (bdistUrl !== undefined) {
    core.info(`Found package ${bdistName}`)
    try {
      core.info(`Downloading package ${bdistName} from ${bdistUrl}`)
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
  const bdistName = renderName(options['bdist-name'], options)
  const bdistDir = path.join(opts.agdaDir(), 'bdist', bdistName)
  util.mkdirP(bdistDir)

  // Copy binaries:
  util.mkdirP(path.join(bdistDir, 'bin'))
  for (const binName of util.agdaBinNames)
    await util.cp(
      path.join(installDir, 'bin', binName),
      path.join(bdistDir, 'bin', binName)
    )

  // Copy data:
  await util.cpR(path.join(installDir, 'data'), bdistDir)

  // Compress binaries:
  if (opts.compressExe(options)) {
    try {
      const upxExe = await setupUpx(options)
      for (const binName of util.agdaBinNames)
        await compressBin(upxExe, path.join(bdistDir, 'bin', binName))
    } catch (error) {
      core.debug(ensureError(error).message)
    }
  }

  // Bundle libraries:
  await bundleLibs(bdistDir, options)

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
  await printNeededLibs(binPath)
  // Compress with UPX:
  await util.getOutput(upxExe, ['--best', binPath])
  // Print the needed libraries after compressing:
  await printNeededLibs(binPath)
}

async function bundleLibs(
  bdistDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      // Create bdistDir/lib:
      if (options['bdist-libs'].length > 0) {
        for (const binName of util.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          await util.patchelf('-add-rpath', "'$ORIGIN/../lib'", binPath)
        }
      }

      // Copy needed libraries:
      for (const libPath of options['bdist-libs']) {
        await util.cp(
          path.join(libPath),
          path.join(bdistDir, 'lib', path.basename(libPath))
        )
      }

      // Patch run paths:
      if (options['bdist-libs'].length > 0) {
        for (const binName of util.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          await util.patchelf('-add-rpath', "'$ORIGIN/../lib'", binPath)
        }
      }
      break
    }
    case 'macos': {
      // Create bdist/lib
      if (options['bdist-libs'].length > 0) {
        await util.mkdirP(path.join(bdistDir, 'lib'))
      }

      // Copy needed libraries:
      const libDirs = new Set<string>()
      for (const libPath of options['bdist-libs']) {
        const libName = path.basename(libPath)
        libDirs.add(path.dirname(libPath))
        await util.cp(path.join(libPath), path.join(bdistDir, 'lib', libName))
      }

      // Patch run paths for loaded libraries:
      if (options['bdist-libs'].length > 0) {
        for (const binName of util.agdaBinNames) {
          const binPath = path.join(bdistDir, 'bin', binName)
          for (const libPath of options['bdist-libs']) {
            const libName = path.basename(libPath)
            await util.installNameTool(
              '-change',
              libPath,
              `@rpath/${libName}`,
              binPath
            )
          }
          await util.installNameTool(
            '-add_rpath',
            '@executable_path/../lib',
            ...[...libDirs].flatMap(libDir => ['-add_rpath', libDir]),
            binPath
          )
        }
      }
      break
    }
    case 'windows': {
      // Copy needed libraries:
      for (const libPath of options['bdist-libs']) {
        await util.cp(
          path.join(libPath),
          path.join(bdistDir, 'bin', path.basename(libPath))
        )
      }
      break
    }
  }
}

export function renderName(
  template: string,
  options: opts.BuildOptions
): string {
  const templateOrDefault =
    template !== '' ? template : 'agda-{{agda-version}}-{{arch}}-{{platform}}'
  return Mustache.render(templateOrDefault, {
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
    release: os.release(),
    // Boolean flags:
    'if-stack': options['stack-version'] !== '',
    'if-icu': options['icu-version'] !== '',
    'if-upx': options['upx-version'] !== ''
  })
}

// Helpers for patching executables

async function printNeededLibs(binPath: string): Promise<void> {
  try {
    let output = ''
    switch (opts.os) {
      case 'linux': {
        output = await util.patchelf('--print-needed', binPath)
        break
      }
      case 'macos': {
        output = await util.otool('-L', binPath)
        break
      }
      case 'windows': {
        output = await util.dumpbin('/imports', binPath)
        break
      }
    }
    core.info(`Needed libraries:${os.EOL}${output}`)
  } catch (error) {
    core.debug(ensureError(error).message)
  }
}
