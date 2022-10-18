import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import * as hackage from '../util/hackage'
import ensureError from '../util/ensure-error'

import bundledAgdaPackageInfoCache from './Agda.versions.json'

async function run(): Promise<void> {
  try {
    const packageInfoPath = path.join(
      __dirname,
      '..',
      'src',
      'package-info',
      'Agda.package-info.json'
    )
    const oldPackageInfoCache =
      bundledAgdaPackageInfoCache as hackage.PackageInfoCache
    const newPackageInfoCache = await hackage.getPackageInfo('Agda')
    const oldTime = new Date(oldPackageInfoCache.lastModified).getTime()
    const newTime = new Date(newPackageInfoCache.lastModified).getTime()
    let success = false
    if (oldTime < newTime) {
      // Check if old versions are still available:`
      const versions: string[] = [
        ...Object.keys(oldPackageInfoCache.packageInfo),
        ...Object.keys(newPackageInfoCache.packageInfo)
      ]
      for (const version of versions) {
        success =
          success &&
          // Only the following automatic version status changes are allowed:
          // - undefined  -> normal
          // - normal     -> deprecated
          // - deprecated -> undefined
          // All others require human intervention.
          versionStatusChangeOK(
            version,
            oldPackageInfoCache.packageInfo[version],
            newPackageInfoCache.packageInfo[version]
          )
      }
      if (success) {
        process.stdout.write(`Updated Agda package info${os.EOL}`)
        fs.writeFileSync(packageInfoPath, JSON.stringify(newPackageInfoCache))
      } else {
        process.stdout.write(`refusing to update${os.EOL}`)
      }
    } else {
      process.stdout.write(`up-to-date${os.EOL}`)
    }
  } catch (error) {
    process.stderr.write(ensureError(error).message)
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
    process.stdout.write(
      `Agda version ${version} was normal, is now deprecated${os.EOL}`
    )
  } else if (oldStatus === undefined && newStatus === 'normal') {
    process.stdout.write(`Agda version ${version} added as normal${os.EOL}`)
  } else if (oldStatus === undefined && newStatus === 'deprecated') {
    process.stdout.write(`Agda version ${version} added as deprecated${os.EOL}`)
  } else if (oldStatus === 'deprecated' && newStatus === undefined) {
    process.stderr.write(
      `WARNING: Agda version ${version} was deprecated, is now removed${os.EOL}`
    )
    // NOTE: no package should ever be removed EVEN IF deprecated; but we'll allow it
  } else if (oldStatus === 'deprecated' && newStatus === 'normal') {
    process.stderr.write(
      `Error: Agda version ${version} was deprecated, is now normal${os.EOL}`
    )
    // NOTE: no package should ever be undeprecated; something has gone wrong
    return false
  } else if (oldStatus !== newStatus) {
    process.stderr.write(
      `Error: unexpected status change ${oldStatus} -> ${newStatus}${os.EOL}`
    )
    // NOTE: the above should match any case where oldStatus !== newStatus,
    //       so either or both are not {normal, deprecated, undefined}
    return false
  }
  return true
}

run()
