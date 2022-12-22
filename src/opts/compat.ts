import * as exec from '@actions/exec'
import * as os from 'node:os'
import * as simver from '../util/simver'
import * as logging from '../util/logging'
import {platform} from './platform'
import * as opts from './types'

export async function runPreBuildHook(
  options: Pick<opts.BuildOptions, 'pre-build-hook'>,
  execOptions?: exec.ExecOptions
): Promise<void> {
  if (options['pre-build-hook'] !== '') {
    logging.info(`Running pre-build hook:${os.EOL}${options['pre-build-hook']}`)
    execOptions = execOptions ?? {}
    execOptions.input = Buffer.from(options['pre-build-hook'], 'utf-8')
    await exec.exec('bash', [], execOptions)
  }
}

export function supportsSplitSections(
  options: Pick<opts.BuildOptions, 'ghc-version' | 'cabal-version'>
): boolean {
  // NOTE:
  //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
  //   https://github.com/agda/agda/issues/5940
  const platformOK = platform === 'linux' || platform === 'win32'
  // NOTE:
  //   We only set --split-sections if Ghc >=8.0 and Cabal >=2.2, when the flag was added:
  //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
  const ghcVersionOK = simver.gte(options['ghc-version'], '8.0')
  const cabalVersionOK = simver.gte(options['cabal-version'], '2.2')
  return platformOK && ghcVersionOK && cabalVersionOK
}

export function supportsOptimiseHeavily(
  options: Pick<opts.BuildOptions, 'agda-version'>
): boolean {
  // NOTE:
  //   We only enable --optimise-heavily on versions which support it,
  //   i.e., versions after 2.6.2:
  //   https://github.com/agda/agda/blob/1175c41210716074340da4bd4caa09f4dfe2cc1d/doc/release-notes/2.6.2.md
  return (
    options['agda-version'] === 'HEAD' ||
    simver.gte(options['agda-version'], '2.6.2')
  )
}

export function supportsClusterCounting(
  options: Pick<opts.BuildOptions, 'agda-version'>
): boolean {
  // NOTE:
  //   Agda only supports --cluster-counting on versions after 2.5.3:
  //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
  // NOTE:
  //   Agda versions 2.5.3 - 2.6.2 depend on text-icu ^0.7, but versions
  //   0.7.0.0 - 0.7.1.0 do not compile with icu68+, which can be solved
  //   by passing '--constraint="text-icu >= 0.7.1.0"'
  return (
    options['agda-version'] === 'HEAD' ||
    simver.gte(options['agda-version'], '2.5.3')
  )
}

export function needsIcu(
  options: Pick<opts.BuildOptions, 'agda-version' | 'force-no-cluster-counting'>
): boolean {
  return (
    supportsClusterCounting(options) && !options['force-no-cluster-counting']
  )
}
