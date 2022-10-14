import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as io from '../../util/io'
import * as exec from '../../util/exec'
import * as path from 'node:path'
import * as semver from 'semver'
import * as opts from '../../opts'
import * as util from '../../util'
import * as haskell from '../../util/haskell'
import pick from 'object.pick'

export const name = 'stack'

export async function build(
  sourceDir: string,
  installDir: string,
  options: opts.BuildOptions
): Promise<void> {
  const execOptions: exec.ExecOptions = {cwd: sourceDir}
  // Configure, Build, and Install:
  await io.mkdirP(path.join(installDir, 'bin'))
  await haskell.stack(
    ['build', ...buildFlags(options), '--copy-bins'],
    execOptions
  )
  // Copy binaries from local bin
  const localBinDir = await haskell.stackGetLocalBin(
    pick(options, ['ghc-version'])
  )
  const installBinDir = path.join(installDir, 'bin')
  await io.mkdirP(installBinDir)
  for (const binName of util.agdaBinNames) {
    await io.mv(
      path.join(localBinDir, binName),
      path.join(installBinDir, binName)
    )
  }
}

function buildFlags(options: opts.BuildOptions): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Load default configuration from 'stack-<agda-version>.yaml':
  flags.push(`--stack-yaml=stack-${options['ghc-version']}.yaml`)
  // Disable Stack managed GHC:
  if (!options['stack-setup-ghc']) {
    flags.push('--no-install-ghc')
    flags.push('--system-ghc')
  }
  // Disable profiling:
  flags.push('--no-executable-profiling')
  flags.push('--no-library-profiling')
  // If supported, pass Agda flag --cluster-counting
  if (opts.supportsClusterCounting(options)) {
    flags.push('--flag=Agda:enable-cluster-counting')
  }
  // If supported, pass Agda flag --optimise-heavily
  if (opts.supportsOptimiseHeavily(options)) {
    flags.push('--flag=Agda:optimise-heavily')
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
  return versions
}
