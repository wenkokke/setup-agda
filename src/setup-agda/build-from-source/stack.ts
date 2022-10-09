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
  await haskell.execSystemStack(['build'].concat(buildFlags(options)), {
    cwd: sourceDir
  })
  // Get directory where Stack installs binaries:
  const stackLocal = await getStackLocalBin(options)
  await io.mkdirP(path.join(installDir, 'bin'))
  await io.mv(
    path.join(stackLocal, agda.agdaExe),
    path.join(installDir, 'bin', agda.agdaExe)
  )
  await io.mv(
    path.join(stackLocal, agda.agdaModeExe),
    path.join(installDir, 'bin', agda.agdaModeExe)
  )
}

async function getStackLocalBin(
  options: Readonly<opts.SetupOptions>
): Promise<string> {
  const flags: string[] = []
  flags.push(`--compiler=ghc-${options['ghc-version']}`)
  if (options['stack-setup-ghc'] === '') {
    flags.push('--no-install-ghc')
    flags.push('--system-ghc')
  }
  flags.push('--local-bin')
  const output = await haskell.execSystemStack(['path', ...flags])
  return output.trim()
}

function buildFlags(options: Readonly<opts.SetupOptions>): string[] {
  // NOTE:
  //   We set the build flags following Agda's deploy workflow, which builds
  //   the nightly distributions, except that we disable --cluster-counting
  //   for all builds. See:
  //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
  const flags: string[] = []
  // Start with stack-*.yaml:
  flags.push(`--stack-yaml=stack-${options['ghc-version']}.yaml`)
  // Override 'install-ghc' and 'system-ghc' based on options:
  if (options['stack-setup-ghc'] === '') {
    flags.push('--no-install-ghc')
    flags.push('--system-ghc')
  }
  // Add Agda build flags:
  flags.push('--no-executable-profiling')
  flags.push('--no-library-profiling')
  // Disable --cluster-counting
  if (agda.supportsClusterCounting(options)) {
    flags.push('--flag=Agda:-enable-cluster-counting')
  }
  // If supported, build a static executable
  // if (haskell.supportsExecutableStatic(options))
  // If supported, set --split-sections.
  // if (haskell.supportsSplitSections(options))
  // Finally, add --copy-bins to install to stack local:
  flags.push('--copy-bins')
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
