import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as path from 'node:path'
import * as opts from './opts'
import buildFromSource from './setup-agda/build-from-source'
import * as bdist from './setup-agda/bdist'
import * as util from './util'
import assert from 'node:assert'

export default async function setup(options: opts.BuildOptions): Promise<void> {
  try {
    // 1. Parse inputs & validate inputs:
    await util.resolveAgdaVersion(options)
    // Set 'agda-version' output:
    core.setOutput('agda-version', options['agda-version'])

    // 2. Find an existing Agda build or build from source:
    let agdaDir: string | null = null
    // 2.1. Try the GitHub Tool Cache:
    if (!options['force-build'] && agdaDir === null)
      agdaDir = await core.group(
        `🔍 Searching for Agda ${options['agda-version']} in tool cache`,
        async () => await findInToolCache(options)
      )
    // 2.2. Try the custom package index:
    if (!options['force-build'] && agdaDir === null)
      agdaDir = await core.group(
        `🔍 Searching for Agda ${options['agda-version']} in package index`,
        async () => await findInPackageIndex(options)
      )
    // 2.3. Build from source:
    if (!options['force-no-build'] && agdaDir === null)
      agdaDir = await buildFromSource(options)
    else if (agdaDir === null)
      throw Error('Required build, but "force-no-build" is set.')

    // 3. Set environment variables:
    const installDir = opts.installDir(options['agda-version'])
    await core.group(`🚀 Install Agda ${options['agda-version']}`, async () => {
      assert(
        agdaDir !== null,
        `Variable 'agdaDir' was mutated after build tasks finished. Did you forget an 'await'?`
      )
      if (installDir !== agdaDir) {
        core.info(`Install Agda to ${installDir}`)
        await util.mkdirP(path.dirname(installDir))
        await util.cpR(agdaDir, installDir)
        try {
          await util.rmRF(agdaDir)
        } catch (error) {
          core.debug(`Failed to clean up build: ${ensureError(error).message}`)
        }
      }
      await util.setupAgdaEnv(installDir)
    })

    // 4. Test:
    await core.group(
      '👩🏾‍🔬 Testing Agda installation',
      async () => await util.agdaTest()
    )
  } catch (error) {
    core.setFailed(ensureError(error))
  }
}

// Helper to install from GitHub Runner tool cache

// NOTE: We can hope, can't we?

async function findInToolCache(
  options: opts.BuildOptions
): Promise<string | null> {
  const agdaDirTC = tc.find('agda', options['agda-version'])
  // NOTE: tc.find returns '' if the tool is not found
  if (agdaDirTC === '') {
    core.info(`Could not find cache for Agda ${options['agda-version']}`)
    return null
  } else {
    core.info(`Found cache for Agda ${options['agda-version']}`)
    core.info(`Testing cache for Agda ${options['agda-version']}`)
    try {
      util.agdaTest({
        agdaBin: path.join(agdaDirTC, 'bin', util.agdaBinName),
        agdaDataDir: path.join(agdaDirTC, 'data')
      })
      return agdaDirTC
    } catch (error) {
      const warning = ensureError(error)
      warning.message = `Rejecting cached Agda ${options['agda-version']}: ${warning.message}`
      core.warning(warning)
      return null
    }
  }
}

// Helper to install from binary distributions

async function findInPackageIndex(
  options: opts.BuildOptions
): Promise<string | null> {
  // Download & extract package:
  const bdistZip = await bdist.download(options)
  if (bdistZip === null) return null
  const bdistDir = await tc.extractZip(bdistZip)
  // Try to clean up .zip archive:
  try {
    util.rmRF(bdistZip)
  } catch (error) {
    core.debug(`Could not clean up: ${ensureError(error).message}`)
  }
  // If needed, repair file permissions:
  await repairPermissions(bdistDir)
  // Test package:
  core.info(`Testing Agda ${options['agda-version']} package`)
  try {
    await util.agdaTest({
      agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
      agdaDataDir: path.join(bdistDir, 'data')
    })
    return bdistDir
  } catch (error) {
    const warning = ensureError(error)
    warning.message = `Rejecting Agda ${options['agda-version']} package: ${warning.message}`
    core.warning(warning)
    return null
  }
}

async function repairPermissions(bdistDir: string): Promise<void> {
  switch (opts.os) {
    case 'linux': {
      // Repair file permissions
      core.info('Repairing file permissions')
      for (const binName of util.agdaBinNames) {
        await util.chmod('+x', path.join(bdistDir, 'bin', binName))
      }
      break
    }
    case 'macos': {
      // Repair file permissions
      core.info('Repairing file permissions')
      // Repair file permissions on executables
      for (const binName of util.agdaBinNames) {
        await util.chmod('+x', path.join(bdistDir, 'bin', binName))
        await util.xattr('-c', path.join(bdistDir, 'bin', binName))
      }
      // Repair file permissions on libraries
      const libGlobber = await glob.create(path.join(bdistDir, 'lib', '*'))
      for await (const libPath of libGlobber.globGenerator()) {
        await util.chmod('+w', libPath)
        await util.xattr('-c', libPath)
        await util.chmod('-w', libPath)
      }
      break
    }
  }
}
