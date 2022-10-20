import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as opts from '../opts'
import * as exec from './exec'
import * as simver from './simver'
import * as hackage from './hackage'
import assert from 'node:assert'

// Hackage helpers

// Agda utilities

type Ref = 'HEAD'

const agdaHeadSdistUrl =
  'https://github.com/agda/agda-stdlib/archive/refs/heads/master.zip'

export async function getAgdaSdist(
  options: opts.BuildOptions
): Promise<string> {
  const agdaVersion = options['agda-version']
  if (opts.isAgdaVersion(agdaVersion)) {
    return await getAgdaSdistFromHackage(agdaVersion)
  } else {
    return await getAgdaSdistFromGitHub(agdaVersion)
  }
}

async function getAgdaSdistFromGitHub(ref: Ref): Promise<string> {
  assert(ref === 'HEAD', `getAgdaSdistFromGitHub: unsupported ref '${ref}'`)
  const packageZip = await tc.downloadTool(agdaHeadSdistUrl)
  const packageDir = await tc.extractZip(packageZip)
  return packageDir
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

// Executable names

export const agdaBinName: string =
  opts.platform === 'win32' ? 'agda.exe' : 'agda'

export const agdaModeBinName: string =
  opts.platform === 'win32' ? 'agda-mode.exe' : 'agda-mode'

export const agdaBinNames: string[] = [agdaBinName, agdaModeBinName]

// System calls

export interface AgdaOptions {
  agdaBin: string
  agdaDataDir: string
}

function resolveAgdaOptions(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): [string, exec.ExecOptions | undefined] {
  const agdaBin = agdaOptions?.agdaBin ?? agdaBinName
  // Set 'Agda_datadir' if it is explicitly passed:
  const agdaDataDirUnset =
    options?.env?.Agda_datadir === undefined &&
    process.env.Agda_datadir !== undefined
  if (agdaOptions?.agdaDataDir !== undefined || agdaDataDirUnset) {
    const agdaDataDirDefault = path.normalize(
      path.join(path.dirname(path.resolve(agdaBin)), '..', 'data')
    )
    options = {
      ...options,
      env: {
        ...(options?.env ?? process.env),
        Agda_datadir: agdaOptions?.agdaDataDir ?? agdaDataDirDefault
      }
    }
  }
  return [agdaBin, options]
}

function parseAgdaVersionOutput(progOutput: string): string {
  if (progOutput.startsWith('Agda version ')) {
    return progOutput.substring('Agda version '.length).trim()
  } else {
    throw Error(`Could not parse Agda version: '${progOutput}'`)
  }
}

export async function agdaGetVersion(
  agdaOptions?: Partial<AgdaOptions>,
  options?: exec.ExecOptions
): Promise<string> {
  const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options)
  const versionOptions = {
    ...optionsWithDataDir,
    parseOutput: parseAgdaVersionOutput
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
    const agdaBin = agdaOptions?.agdaBin ?? (await exec.which(agdaBinName))
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

export async function installAgda(installDir: string): Promise<void> {
  const dataDir = path.join(installDir, 'data')
  core.info(`Set Agda_datadir to ${dataDir}`)
  core.exportVariable('Agda_datadir', dataDir)
  core.setOutput('agda-data-path', dataDir)
  const binDir = path.join(installDir, 'bin')
  core.info(`Add ${binDir} to PATH`)
  core.addPath(binDir)
  core.setOutput('agda-path', binDir)
  core.setOutput('agda-exe', path.join(binDir, agdaBinName))
  core.setOutput('agda-mode-exe', path.join(binDir, agdaModeBinName))
}
