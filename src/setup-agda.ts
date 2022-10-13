import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import ensureError from 'ensure-error'
import * as path from 'path'
import * as opts from './opts'
import buildFromSource from './setup-agda/build-from-source'
import * as util from './util'

export default async function setup(
  inputs?:
    | Partial<opts.SetupAgdaInputs>
    | Partial<Record<string, string>>
    | ((name: string) => string | undefined)
): Promise<void> {
  try {
    // 1. Parse inputs & validate inputs:
    const buildOptions = await core.group(
      '🛠 Preparing to setup an Agda environment',
      async () => {
        const options = opts.getOptions(inputs)
        return await util.resolveAgdaVersion(options)
      }
    )

    // 3. Build from source:
    // NOTE: As output groups cannot be nested, we defer to individual functions.
    let maybeAgdaDir: string | null = null
    if (maybeAgdaDir === null)
      maybeAgdaDir = await installFromToolCache(buildOptions)
    if (maybeAgdaDir === null)
      maybeAgdaDir = await buildFromSource(buildOptions)
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

// Helper to check GitHub Runner tool cache

// NOTE: We can hope, can't we?

export async function installFromToolCache(
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
