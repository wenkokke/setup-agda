import * as core from '@actions/core'
import * as glob from '@actions/glob'
import assert from 'node:assert'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as opts from '../../opts'
import * as exec from '../exec'
import * as hackage from './hackage'
import {splitLines} from '../lines'
import * as simver from '../simver'

// Agda utilities

export function readLibrariesSync(): path.ParsedPath[] {
  if (!fs.existsSync(opts.agdaLibrariesFile())) return []
  const librariesFileContents = fs
    .readFileSync(opts.agdaLibrariesFile())
    .toString()
  const libraries = splitLines(librariesFileContents)
  return libraries.map(libraryPath => path.parse(libraryPath))
}

export function readDefaultsSync(): string[] {
  if (!fs.existsSync(opts.agdaDefaultsFile())) return []
  const defaultsFileContents = fs
    .readFileSync(opts.agdaDefaultsFile())
    .toString()
  return splitLines(defaultsFileContents)
}

export function readExecutablesSync(): string[] {
  if (!fs.existsSync(opts.agdaExecutablesFile())) return []
  const defaultsFileContents = fs
    .readFileSync(opts.agdaDefaultsFile())
    .toString()
  return splitLines(defaultsFileContents)
}

export function registerAgdaLibrary(
  libraryFile: string,
  isDefault = false
): void {
  // Check agdaLibraryFile exists & refers to an agda-lib file:
  assert(fs.existsSync(libraryFile))
  const newLibrary = path.parse(path.resolve(libraryFile))
  assert(newLibrary.ext === '.agda-lib')
  // Load the current libraries file:
  const oldLibraries = readLibrariesSync()
  if (oldLibraries.some(oldLibrary => oldLibrary.name === newLibrary.name))
    core.warning(
      `Agda libraries file already contains a copy of ${newLibrary.name}`
    )
  const newLibraries = [...oldLibraries, newLibrary]
  fs.writeFileSync(
    opts.agdaLibrariesFile(),
    newLibraries
      .map(libraryParsedPath => path.format(libraryParsedPath))
      .join(os.EOL)
  )
  // Add the library to defaults:
  if (isDefault === true) {
    const oldDefaults = readDefaultsSync()
    const newDefaults = [...oldDefaults, newLibrary.name]
    fs.writeFileSync(opts.agdaDefaultsFile(), newDefaults.join(os.EOL))
  }
}

export function registerAgdaExecutable(newExecutable: string): void {
  const oldExecutables = readExecutablesSync()
  const newExecutables = [...oldExecutables, newExecutable]
  fs.writeFileSync(opts.agdaExecutablesFile(), newExecutables.join(os.EOL))
}

export async function getAgdaSdist(
  options: opts.BuildOptions
): Promise<string> {
  // Throw an error if the 'agda-version' is 'nightly':
  if (options['agda-version'] === 'nightly')
    throw Error('Cannot get source distribution for Agda version "nightly"')

  const agdaVersion = options['agda-version']
  if (opts.isAgdaVersion(agdaVersion)) {
    core.info(
      `Downloading source distribution for Agda ${agdaVersion} from Hackage`
    )
    return await getAgdaSdistFromHackage(agdaVersion)
  } else {
    core.info(
      `Downloading source distribution for Agda ${agdaVersion} from GitHub`
    )
    return await getAgdaSdistFromGitHub(agdaVersion)
  }
}

const agdaGitUrl = 'https://github.com/agda/agda.git'

async function getAgdaSdistFromGitHub(
  agdaVersion: opts.AgdaGitRef
): Promise<string> {
  if (agdaVersion === 'HEAD') {
    core.info(`Cloning from ${agdaGitUrl}`)
    const sourceDir = opts.setupAgdaCacheDir('agda-HEAD')
    await exec.getOutput('git', [
      'clone',
      '--single-branch',
      '--depth=1',
      agdaGitUrl,
      sourceDir
    ])
    await exec.getOutput('git', ['submodule', 'init'], {cwd: sourceDir})
    await exec.getOutput('git', ['submodule', 'update', '--depth=1'], {
      cwd: sourceDir
    })
    return sourceDir
  } else {
    throw Error(`getAgdaSdistFromGitHub: unsupported ref '${agdaVersion}'`)
  }
}

async function getAgdaSdistFromHackage(
  agdaVersion: opts.AgdaVersion
): Promise<string> {
  // Get the package source:
  const {packageVersion, packageDir} = await hackage.getPackageSource('Agda', {
    packageVersion: agdaVersion,
    fetchPackageInfo: false,
    packageInfoCache: opts.agdaPackageInfoCache
  })
  assert(
    agdaVersion === packageVersion,
    `getAgdaSdist: ${agdaVersion} was resolved to ${packageVersion}`
  )
  return packageDir
}

// System calls

export interface AgdaOptions {
  agdaExePath: string
  agdaDataDir: string
}

function resolveAgdaOptions(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): [string, exec.ExecOptions | undefined] {
  const agdaExePath =
    agdaOptions?.agdaExePath ?? opts.agdaComponents['Agda:exe:agda'].exe
  // Set 'Agda_datadir' if it is explicitly passed:
  const agdaDataDirUnset =
    options?.env?.Agda_datadir === undefined &&
    process.env.Agda_datadir !== undefined
  if (agdaOptions?.agdaDataDir !== undefined || agdaDataDirUnset) {
    const agdaDataDirDefault = path.normalize(
      path.join(path.dirname(path.resolve(agdaExePath)), '..', 'data')
    )
    options = {
      ...options,
      env: {
        ...(options?.env ?? process.env),
        Agda_datadir: agdaOptions?.agdaDataDir ?? agdaDataDirDefault
      }
    }
  }
  return [agdaExePath, options]
}
export async function agdaGetVersion(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  const versionOptions = {
    ...optionsWithDataDir,
    parseOutput: (progOutput: string): string => {
      if (progOutput.startsWith('Agda version '))
        return progOutput.substring('Agda version '.length).trim()
      else throw Error(`Could not parse Agda version: '${progOutput}'`)
    }
  }
  return await exec.getVersion(agdaBin, versionOptions)
}

export async function agdaGetDataDir(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  // Support for --print-agda-dir was added in 2.6.2
  // https://github.com/agda/agda/commit/942c4a86d4941ba14d73ff173bd7d2b26e54da6c
  const agdaVersion = await agdaGetVersion(agdaOptions, options)
  if (simver.gte(agdaVersion, '2.6.2')) {
    return await agda(['--print-agda-dir'], agdaOptions, options)
  } else {
    const agdaDataDir = agdaOptions?.agdaDataDir ?? options?.env?.Agda_datadir
    if (agdaDataDir !== undefined) return agdaDataDir
    const agdaBin =
      agdaOptions?.agdaExePath ??
      (await exec.which(opts.agdaComponents['Agda:exe:agda'].exe))
    return path.join(path.basename(agdaBin), '..', 'data')
  }
}

export async function agda(
  args: string[],
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  return await exec.getOutput(agdaBin, args, optionsWithDataDir)
}

export async function agdaTest(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<void> {
  const versionString = await agdaGetVersion(agdaOptions)
  core.info(`Found Agda version ${versionString} on PATH`)
  const dataDir = await agdaGetDataDir(agdaOptions)
  core.info(`Found Agda data directory at ${dataDir}`)
  const globber = await glob.create(
    path.join(dataDir, 'lib', 'prim', '**', '*.agda'),
    {
      followSymbolicLinks: false,
      implicitDescendants: false,
      matchDirectories: false
    }
  )
  for await (const agdaFile of globber.globGenerator()) {
    core.info(`Compiling ${agdaFile}`)
    await agda(['-v0', agdaFile], agdaOptions, {
      ...options,
      cwd: path.join(dataDir, 'lib', 'prim')
    })
  }
}

export async function configureEnvFor(installDir: string): Promise<void> {
  const dataDir = path.join(installDir, 'data')
  core.info(`Set Agda_datadir to ${dataDir}`)
  core.exportVariable('Agda_datadir', dataDir)
  core.setOutput('agda-data-path', dataDir)
  const binDir = path.join(installDir, 'bin')
  core.info(`Add ${binDir} to PATH`)
  core.addPath(binDir)
  core.setOutput('agda-path', binDir)
  core.setOutput(
    'agda-exe',
    path.join(binDir, opts.agdaComponents['Agda:exe:agda'].exe)
  )
  core.setOutput(
    'agda-mode-exe',
    path.join(binDir, opts.agdaComponents['Agda:exe:agda-mode'].exe)
  )
}
