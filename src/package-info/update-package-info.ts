import * as agda from '../util/agda'
import * as os from 'os'
import * as fs from 'fs'
import * as path from 'path'
import * as hackage from '../util/hackage'
import * as packageInfoCache from './Agda.json'

async function run(): Promise<void> {
  const oldPackageInfoCache = packageInfoCache as hackage.PackageInfoCache
  const newPackageInfoCache = await agda.getPackageInfo()
  const oldTime = new Date(oldPackageInfoCache.lastModified).getTime()
  const newTime = new Date(newPackageInfoCache.lastModified).getTime()
  let failed = false
  if (oldTime < newTime) {
    // Check if old versions are still available:`
    const versions: string[] = Object.keys(
      oldPackageInfoCache.packageInfo
    ).concat(Object.keys(newPackageInfoCache.packageInfo))
    for (const version of versions) {
      const oldStatus = oldPackageInfoCache.packageInfo[version]
      const newStatus = newPackageInfoCache.packageInfo[version]
      if (oldStatus === 'normal' && newStatus === undefined) {
        process.stderr.write(
          `update-package-info: ERROR: Agda version ${version} was normal, is now removed${os.EOL}`
        )
        // NOTE: no package should ever be removed without being deprecated; something has gone wrong
        failed = true
      } else if (oldStatus === 'normal' && newStatus === 'deprecated') {
        process.stdout.write(
          `update-package-info: Agda version ${version} was normal, is now deprecated${os.EOL}`
        )
      } else if (oldStatus === undefined && newStatus === 'normal') {
        process.stdout.write(
          `update-package-info: Agda version ${version} added as normal${os.EOL}`
        )
      } else if (oldStatus === undefined && newStatus === 'deprecated') {
        process.stdout.write(
          `update-package-info: Agda version ${version} added as deprecated${os.EOL}`
        )
      } else if (oldStatus === 'deprecated' && newStatus === undefined) {
        process.stderr.write(
          `update-package-info: WARNING: Agda version ${version} was deprecated, is now removed${os.EOL}`
        )
        // NOTE: no package should ever be removed EVEN IF deprecated; but we'll allow it
      } else if (oldStatus === 'deprecated' && newStatus === 'normal') {
        process.stderr.write(
          `update-package-info: ERROR: Agda version ${version} was deprecated, is now normal${os.EOL}`
        )
        // NOTE: no package should ever be undeprecated; something has gone wrong
        failed = true
      } else if (oldStatus !== newStatus) {
        process.stderr.write(
          `update-package-info: ERROR: unexpected status change ${oldStatus} -> ${newStatus}${os.EOL}`
        )
        // NOTE: the above should match any case where oldStatus !== newStatus,
        //       so either or both are not {normal, deprecated, undefined}
        failed = true
      }
    }
    if (failed === false) {
      process.stdout.write(`update-package-info: updated${os.EOL}`)
      fs.writeFileSync(
        path.join(__dirname, 'Agda.json'),
        JSON.stringify(newPackageInfoCache)
      )
    } else {
      process.stdout.write(`update-package-info: refusing to update${os.EOL}`)
    }
  } else {
    process.stdout.write(`update-package-info: up-to-date${os.EOL}`)
  }
}

run()
