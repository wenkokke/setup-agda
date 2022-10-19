import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as semver from 'semver'
import * as yaml from 'js-yaml'
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
  writeStackYaml(sourceDir, options, matchingGhcVersionsThatCanBuildAgda)

  // TODO: run pre-build-hook

  // Configure, Build, and Install:
  await util.stack(
    ['build', ...buildFlags(sourceDir, options), '--copy-bins'],
    {
      cwd: sourceDir
    }
  )
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

function buildFlags(sourceDir: string, options: opts.BuildOptions): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Disable Stack managed GHC:
  if (options['stack-setup-ghc']) {
    flags.push('--no-system-ghc')
    flags.push('--install-ghc')
  } else {
    flags.push('--no-install-ghc')
    flags.push('--system-ghc')
  }
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

interface StackYaml {
  'extra-deps'?: string[]
  'configure-options'?: Partial<Record<string, string[]>>
  'compiler-check': 'match-minor' | 'match-exact' | 'newer-minor'
}

async function writeStackYaml(
  sourceDir: string,
  options: opts.BuildOptions,
  matchingGhcVersionsThatCanBuildAgda: string[]
): Promise<void> {
  // Find and load stack.yml:
  const stackYamlFrom = await findStackYaml(
    sourceDir,
    options,
    matchingGhcVersionsThatCanBuildAgda
  )
  const stackYaml = yaml.load(
    fs.readFileSync(stackYamlFrom, 'utf-8')
  ) as StackYaml

  // Did we get an exact match? If not, allow 'newer-minor':
  if (!ghcVersionMatchExact(options, matchingGhcVersionsThatCanBuildAgda)) {
    core.info(`stack: Setting 'compiler-check' to 'newer-minor'`)
    stackYaml['compiler-check'] = 'newer-minor'
  }

  // Did we get any 'configure-options'?
  if (options['configure-options'] !== '') {
    const configureOptions = options['configure-options']
      .split(/\s+/g)
      .filter(opt => opt !== '')
    core.info(
      [
        `stack: Adding 'configure-options' for package 'Agda':`,
        ...configureOptions.map(opt => `- ${opt}`)
      ].join(os.EOL)
    )
    stackYaml['configure-options'] = stackYaml?.['configure-options'] ?? {}
    stackYaml['configure-options']['Agda'] =
      stackYaml['configure-options']?.['Agda'] ?? []
    for (const configureOption of opts.getConfigureOptions(options)) {
      stackYaml['configure-options']['Agda'].push(configureOption)
    }
  }

  // Write the resulting file to stack.yaml:
  const stackYamlTo = path.join(sourceDir, 'stack.yaml')
  const stackYamlString = yaml.dump(stackYaml)
  core.info(`stack: Writing 'stack.yaml':${os.EOL}${stackYamlString}`)
  fs.writeFileSync(stackYamlTo, stackYamlString)
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
  const stackYaml = path.join(sourceDir, stackYamlName)
  core.info(`stack: Loading ${stackYamlName}`)
  assert(fs.existsSync(stackYaml))
  return stackYaml
}

function ghcVersionMatchExact(
  options: opts.BuildOptions,
  matchingGhcVersionsThatCanBuildAgda: string[]
): boolean {
  return matchingGhcVersionsThatCanBuildAgda.includes(options['ghc-version'])
}
