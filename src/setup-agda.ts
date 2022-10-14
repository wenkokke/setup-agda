import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as path from 'node:path'
import * as opts from './opts'
import buildFromSource from './setup-agda/build-from-source'
import * as bdist from './setup-agda/bdist'
import * as util from './util'

export default async function setup(
  inputs?:
    | Partial<opts.SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined)
): Promise<void> {
  try {
    // 1. Parse inputs & validate inputs:
    const options = await util.resolveAgdaVersion(opts.getOptions(inputs))

    // 3. Build from source:
    // NOTE: As output groups cannot be nested, we defer to individual functions.
    let maybeAgdaDir: string | null = null
    if (!options['force-build'] && maybeAgdaDir === null)
      maybeAgdaDir = await installFromToolCache(options)
    if (!options['force-build'] && maybeAgdaDir === null)
      maybeAgdaDir = await installFromBdist(options)
    if (!options['force-no-build'] && maybeAgdaDir === null)
      maybeAgdaDir = await buildFromSource(options)
    else if (maybeAgdaDir === null)
      throw Error('Required build, but "force-no-build" is set.')
    const agdaDir: string = maybeAgdaDir

    // 4. Set environment variables:
    await core.group('📝 Registering Agda installation', async () => {
      await util.setupAgdaEnv(agdaDir)
    })

    // 5. Test:
    await core.group(
      '👩🏾‍🔬 Testing Agda installation',
      async () => await util.testAgda()
    )
  } catch (error) {
    core.setFailed(ensureError(error))
  }
}

// Helper to install from GitHub Runner tool cache

// NOTE: We can hope, can't we?

async function installFromToolCache(
  options: opts.BuildOptions
): Promise<string | null> {
  const maybeAgdaDir = await core.group(
    `🔍 Searching for Agda ${options['agda-version']} in tool cache`,
    async () => {
      const agdaDirTC = tc.find('agda', options['agda-version'])
      // NOTE: tc.find returns '' if the tool is not found
      if (agdaDirTC === '') {
        core.info(
          `Could not find Agda ${options['agda-version']} in the tool cache`
        )
        return null
      } else {
        core.info(`Found Agda ${options['agda-version']} in the tool cache`)
        return agdaDirTC
      }
    }
  )
  if (maybeAgdaDir === null) {
    return null
  } else {
    return await core.group('👩🏾‍🔬 Testing cached Agda installation', async () => {
      try {
        util.testAgda({
          agdaBin: path.join(maybeAgdaDir, 'bin', util.agdaBinName),
          agdaDataDir: path.join(maybeAgdaDir, 'data')
        })
        return maybeAgdaDir
      } catch (error) {
        const warning = ensureError(error)
        warning.message = `Rejecting cached Agda ${options['agda-version']}: ${warning.message}`
        core.warning(warning)
        return null
      }
    })
  }
}

// Helper to install from binary distributions

async function installFromBdist(
  options: opts.BuildOptions
): Promise<string | null> {
  // 1. Download:
  const {bdistDir} = await core.group(
    `🔍 Searching for Agda ${options['agda-version']} in package index`,
    async () => {
      const ret: Partial<{bdistDir: string}> = {}
      const bdistZip = await bdist.download(options)
      if (bdistZip === null) return ret
      ret.bdistDir = await tc.extractZip(bdistZip)
      util.rmRF(bdistZip)
      return ret
    }
  )
  if (bdistDir === undefined) return null

  // 2. Repair file permissions:
  await core.group(
    `🔧 Repairing file permissions`,
    async () => await repairPermissions(bdistDir)
  )

  // 3. Test:
  const bdistOK = await core.group(
    `👩🏾‍🔬 Testing Agda ${options['agda-version']} package`,
    async () => {
      try {
        await util.testAgda({
          agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
          agdaDataDir: path.join(bdistDir, 'data')
        })
        return true
      } catch (error) {
        const warning = ensureError(error)
        warning.message = `Rejecting Agda ${options['agda-version']} package: ${warning.message}`
        core.warning(warning)
        return false
      }
    }
  )
  if (!bdistOK) return null

  // 4. Install:
  const installDir = opts.installDir(options['agda-version'])
  await core.group(
    `🔍 Installing Agda ${options['agda-version']} package`,
    async () => {
      await util.mkdirP(path.dirname(installDir))
      await util.mv(bdistDir, installDir)
    }
  )
  return installDir
}

async function repairPermissions(bdistDir: string): Promise<void> {
  if (opts.os === 'macos') {
    // Fix permissions on binaries
    for (const binName of util.agdaBinNames) {
      await util.chmod('+x', path.join(bdistDir, 'bin', binName))
      await util.xattr('-c', path.join(bdistDir, 'bin', binName))
    }
    // Fix permissions on libraries
    const libGlobber = await glob.create(path.join(bdistDir, 'lib', '*'))
    for await (const libPath of libGlobber.globGenerator()) {
      await util.chmod('+w', libPath)
      await util.xattr('-c', libPath)
      await util.chmod('-w', libPath)
    }
  }
}
