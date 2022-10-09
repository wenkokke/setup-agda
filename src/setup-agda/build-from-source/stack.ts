import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '../../util/io'
import * as path from 'path'
import * as semver from 'semver'
import * as opts from '../../opts'
import * as agda from '../../util/agda'
import * as haskell from '../../util/haskell'

export async function build(
  sourceDir: string,
  installDir: string,
  options: Readonly<opts.SetupOptions>
): Promise<void> {
  // Configure, Build, and Install:
  await io.mkdirP(path.join(installDir, 'bin'))
  await haskell.execSystemStack(
    ['build', ...buildFlags(options), ...installFlags(installDir)],
    {
      cwd: sourceDir
    }
  )
}

function installFlags(installDir: string): string[] {
  const flags: string[] = []
  // Copy binaries to installDir:
  flags.push('--copy-bins')
  flags.push(`--local-bin-dir=${installDir}`)
  return flags
}

function buildFlags(options: Readonly<opts.SetupOptions>): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Load default configuration from 'stack-<agda-version>.yaml':
  flags.push(`--stack-yaml=stack-${options['ghc-version']}.yaml`)
  // Disable Stack managed GHC:
  if (options['stack-setup-ghc'] === '') {
    flags.push('--no-install-ghc')
    flags.push('--system-ghc')
  }
  // Disable profiling:
  flags.push('--no-executable-profiling')
  flags.push('--no-library-profiling')
  // If supported, pass Agda flag --cluster-counting
  if (agda.supportsClusterCounting(options)) {
    flags.push('--flag=Agda:+enable-cluster-counting')
  }
  // If supported, pass Agda flag --optimise-heavily
  if (agda.supportsOptimiseHeavily(options)) {
    flags.push('--flag=Agda:+optimise-heavily')
  }
  // Pass any extra libraries:
  for (const libDir of opts.libDirs(options)) {
    flags.push(`--extra-lib-dirs=${libDir}`)
  }
  // Pass any extra headers:
  for (const includeDir of opts.includeDirs(options)) {
    flags.push(`--extra-include-dirs=${includeDir}`)
  }
  return flags
}

export async function findCompatibleGhcVersions(
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
  return versions
}
