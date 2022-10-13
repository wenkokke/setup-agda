import * as io from '../util/io'
import * as tc from '@actions/tool-cache'
import * as path from 'node:path'
import * as bdist from '../util/bdist'
import * as opts from '../opts'

export default async function installFromBdist(
  options: opts.BuildOptions
): Promise<string | null> {
  // Download bdist:
  const bdistZip = await bdist.download(options)
  if (bdistZip === null) return null
  // Extract bdist:
  const bdistDir = await tc.extractZip(bdistZip)
  io.rmRF(bdistZip) // Clean up bdistZip
  const installDir = opts.installDir(options['agda-version'])
  await io.mkdirP(path.dirname(installDir))
  await io.mv(bdistDir, installDir)
  return installDir
}
