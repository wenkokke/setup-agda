import * as core from '@actions/core'
import * as path from 'path'
import * as opts from './opts'
import buildFromSource from './setup-agda/build-from-source'
import downloadNightly from './setup-agda/download-nightly'
import * as agda from './util/agda'
import ensureError from 'ensure-error'

export default async function setup(
  options?: Partial<opts.BuildOptions>
): Promise<void> {
  try {
    const fullOptions = opts.fromSetupAgdaInputs(options)
    let installDir: string | null = null
    if (fullOptions['agda-version'] === 'nightly') {
      installDir = await downloadNightly()
    } else {
      installDir = await buildFromSource(fullOptions)
    }
    setupEnv(installDir)
    agda.testSystemAgda()
  } catch (error) {
    core.setFailed(ensureError(error))
  }
}

function setupEnv(installDir: string): void {
  // Configure environent & action outputs
  const dataDir = path.join(installDir, 'data')
  core.exportVariable('Agda_datadir', dataDir)
  core.setOutput('agda-data-path', dataDir)
  const binDir = path.join(installDir, 'bin')
  core.addPath(binDir)
  core.setOutput('agda-path', binDir)
}
