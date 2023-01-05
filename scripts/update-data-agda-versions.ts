import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import pick from 'object.pick'
import {agdaPackageInfoCache as oldCache} from '../src/opts/types'
import * as hackage from '../src/util/deps/hackage'
import * as util from '../src/util'

async function run(): Promise<void> {
  try {
    const newCache = await hackage.getPackageInfo('Agda')
    const oldLastModifiedTime = new Date(oldCache.lastModified).getTime()
    const newLastModifiedTime = new Date(newCache.lastModified).getTime()
    let failed = false
    let changed = false
    if (oldLastModifiedTime < newLastModifiedTime) {
      // Check if old versions are still available:`
      const versions: string[] = [
        ...Object.keys(oldCache.packageInfo),
        ...Object.keys(newCache.packageInfo)
      ]
      for (const version of versions) {
        const oldStatus = oldCache.packageInfo?.[version]
        const newStatus = newCache.packageInfo?.[version]
        // Only the following automatic version status changes are allowed:
        // - undefined  -> normal
        // - normal     -> deprecated
        // - deprecated -> undefined
        // All others require human intervention.
        failed = failed || !versionStatusChangeOK(version, oldStatus, newStatus)
        changed = changed || oldStatus === newStatus
      }
      if (!failed) {
        // To help the TypeScript type inference,
        // we save the deprecated and normal versions separately
        util.logging.info(`Updated Agda package info${os.EOL}`)
        fs.writeFileSync(
          path.join(
            __dirname,
            '..',
            'src',
            'data',
            'Agda.versions.deprecated.json'
          ),
          JSON.stringify(
            {
              packageInfo: pick(
                newCache.packageInfo,
                versions.filter(v => newCache.packageInfo[v] === 'deprecated')
              ),
              lastModified: newCache.lastModified
            },
            undefined,
            2
          )
        )
        fs.writeFileSync(
          path.join(
            __dirname,
            '..',
            'src',
            'data',
            'Agda.versions.normal.json'
          ),
          JSON.stringify({
            packageInfo: pick(
              newCache.packageInfo,
              versions.filter(v => newCache.packageInfo[v] === 'normal')
            ),
            lastModified: newCache.lastModified
          })
        )
      } else {
        util.logging.error(`refusing to update${os.EOL}`)
      }
    } else {
      util.logging.error(`up-to-date${os.EOL}`)
    }
  } catch (error) {
    util.logging.error(util.ensureError(error))
  }
}

function versionStatusChangeOK(
  version: string,
  oldStatus?: hackage.PackageStatus,
  newStatus?: hackage.PackageStatus
): boolean {
  if (oldStatus === 'normal' && newStatus === undefined) {
    process.stderr.write(
      `Error: Agda version ${version} was normal, is now removed${os.EOL}`
    )
    // NOTE: no package should ever be removed without being deprecated; something has gone wrong
    return false
  } else if (oldStatus === 'normal' && newStatus === 'deprecated') {
    util.logging.info(
      `Agda version ${version} was normal, is now deprecated${os.EOL}`
    )
  } else if (oldStatus === undefined && newStatus === 'normal') {
    util.logging.info(`Agda version ${version} added as normal${os.EOL}`)
  } else if (oldStatus === undefined && newStatus === 'deprecated') {
    util.logging.info(`Agda version ${version} added as deprecated${os.EOL}`)
  } else if (oldStatus === 'deprecated' && newStatus === undefined) {
    util.logging.warning(
      `Agda version ${version} was deprecated, is now removed${os.EOL}`
    )
    // NOTE: no package should ever be removed EVEN IF deprecated; but we'll allow it
  } else if (oldStatus === 'deprecated' && newStatus === 'normal') {
    util.logging.error(
      `Agda version ${version} was deprecated, is now normal${os.EOL}`
    )
    // NOTE: no package should ever be undeprecated; something has gone wrong
    return false
  } else if (oldStatus !== newStatus) {
    util.logging.error(
      `unexpected status change ${oldStatus} -> ${newStatus}${os.EOL}`
    )
    // NOTE: the above should match any case where oldStatus !== newStatus,
    //       so either or both are not {normal, deprecated, undefined}
    return false
  }
  return true
}

run()
