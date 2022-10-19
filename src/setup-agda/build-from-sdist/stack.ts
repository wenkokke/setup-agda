import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as semver from 'semver'
import * as opts from '../../opts'
import * as util from '../../util'
import pick from 'object.pick'
import assert from 'node:assert'

export const name = 'stack'

export async function build(
  sourceDir: string,
  installDir: string,
  options: opts.BuildOptions,
  matchingGhcVersionsThatCanBuildAgda: string[]
): Promise<void> {
  // Create the stack.yaml file:
  const stackYaml = await findStackYaml(
    sourceDir,
    options,
    matchingGhcVersionsThatCanBuildAgda
  )
  const execOptions: util.ExecOptions = {
    cwd: sourceDir,
    env: {...process.env, STACK_YAML: stackYaml}
  }

  // Set whether or not to use a system GHC:
  if (options['stack-setup-ghc']) {
    await util.stack(['config', 'set', 'system-ghc', 'false'], execOptions)
    await util.stack(['config', 'set', 'install-ghc', 'true'], execOptions)
  } else {
    await util.stack(['config', 'set', 'system-ghc', 'true'], execOptions)
    await util.stack(['config', 'set', 'install-ghc', 'false'], execOptions)
  }

  // Run the pre-build hook:
  await opts.runPreBuildHook(options, execOptions)

  // Configure, Build, and Install:
  await util.stack(['build', ...buildFlags(options)], execOptions)

  // Copy binaries from local bin
  const localBinDir = await util.stackGetLocalBin(
    pick(options, ['ghc-version'])
  )
  const installBinDir = path.join(installDir, 'bin')
  await util.mkdirP(installBinDir)
  for (const binName of util.agdaBinNames) {
    const localBinPath = path.join(localBinDir, binName)
    const installBinPath = path.join(installBinDir, binName)
    await util.cp(localBinPath, installBinPath)
    try {
      await util.rmRF(localBinPath)
    } catch (error) {
      core.debug(`Could not clean up executable at ${localBinPath}`)
    }
  }
}

function buildFlags(options: opts.BuildOptions): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Disable profiling:
  flags.push('--no-executable-profiling')
  flags.push('--no-library-profiling')
  // If supported, pass Agda flag --cluster-counting
  if (
    !options['force-no-cluster-counting'] &&
    opts.supportsClusterCounting(options)
  ) {
    flags.push('--flag=Agda:enable-cluster-counting')
  }
  // If supported, pass Agda flag --optimise-heavily
  if (opts.supportsOptimiseHeavily(options)) {
    flags.push('--flag=Agda:optimise-heavily')
  }
  // Add extra-{include,lib}-dirs:
  for (const includeDir of options['extra-include-dirs']) {
    flags.push(`--extra-include-dirs=${includeDir}`)
  }
  for (const libDir of options['extra-lib-dirs']) {
    flags.push(`--extra-lib-dirs=${libDir}`)
  }
  flags.push('--copy-bins')
  return flags
}

export async function supportedGhcVersions(
  sourceDir: string
): Promise<string[]> {
  const versions: string[] = []
  const stackYamlGlobber = await glob.create(
    path.join(sourceDir, 'stack-*.yaml')
  )
  const stackYamlPaths = await stackYamlGlobber.glob()
  for (const stackYamlPath of stackYamlPaths) {
    const version = path
      .basename(stackYamlPath, '.yaml')
      .substring('stack-'.length)
    if (semver.valid(version) !== null) {
      versions.push(version)
    } else {
      core.warning(
        `Could not parse GHC version '${version}' from ${stackYamlPath}`
      )
    }
  }
  if (versions.length === 0) {
    throw Error(
      [
        `Could not determine supported GHC versions for building with Stack:`,
        `No files matching 'stack-*.yaml' in ${sourceDir}.`
      ].join(os.EOL)
    )
  } else {
    return versions
  }
}

async function findStackYaml(
  sourceDir: string,
  options: opts.BuildOptions,
  matchingGhcVersionsThatCanBuildAgda: string[]
): Promise<string> {
  assert(matchingGhcVersionsThatCanBuildAgda.length > 0)
  let ghcVersionWithStackYaml = null
  if (ghcVersionMatchExact(options, matchingGhcVersionsThatCanBuildAgda)) {
    ghcVersionWithStackYaml = options['ghc-version']
  } else {
    ghcVersionWithStackYaml = semver.maxSatisfying(
      matchingGhcVersionsThatCanBuildAgda,
      '*'
    )
    assert(ghcVersionWithStackYaml !== null)
  }
  const stackYamlName = `stack-${ghcVersionWithStackYaml}.yaml`
  core.info(`stack: Using ${stackYamlName}`)
  assert(fs.existsSync(path.join(sourceDir, stackYamlName)))
  return stackYamlName
}

function ghcVersionMatchExact(
  options: opts.BuildOptions,
  matchingGhcVersionsThatCanBuildAgda: string[]
): boolean {
  return matchingGhcVersionsThatCanBuildAgda.includes(options['ghc-version'])
}
