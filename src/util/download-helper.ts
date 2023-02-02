// Adapted from tool-cache.ts in @actions/tool-cache

import fs from 'fs-extra'
import * as path from 'node:path'
import exec from './exec.js'
import * as tmp from 'tmp'
import unzip from './deps/unzip.js'
import { RetryHelper } from './retry-helper.js'
import { platform } from './platform.js'
import tar from './deps/tar.js'
import pwsh from './deps/pwsh.js'
import powershell from './deps/powershell.js'
import { pipeline } from 'node:stream/promises'
import fetch from 'node-fetch'
import { agdaupCacheDir } from './appdirs.js'
import assert from 'node:assert'
import { Dist, DistType } from './types.js'

// Taken from tool-cache.ts in @actions/tool-cache
export class HTTPError extends Error {
  constructor(readonly httpStatusCode: number | undefined) {
    super(`Unexpected HTTP response: ${httpStatusCode}`)
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// Adapted from tool-cache.ts in @actions/tool-cache
async function download(
  url: string,
  dest?: string | tmp.FileOptions
): Promise<string> {
  const [maxAttempts, minSeconds, maxSeconds] = [3, 10, 20]
  const retryHelper = new RetryHelper(maxAttempts, minSeconds, maxSeconds)
  return await retryHelper.execute(
    async () => {
      return await downloadAttempt(url, dest)
    },
    (error: Error) => {
      if (error instanceof HTTPError && error.httpStatusCode) {
        // Don't retry anything less than 500, except 408 Request Timeout and 429 Too Many Requests
        if (
          error.httpStatusCode < 500 &&
          error.httpStatusCode !== 408 &&
          error.httpStatusCode !== 429
        ) {
          return false
        }
      }
      // Otherwise retry
      return true
    }
  )
}

async function ensureDestDir(
  destDir?: string | tmp.DirOptions
): Promise<string> {
  if (typeof destDir !== 'string') {
    const tmpDir = tmp.dirSync(destDir).name
    logger.debug(`Created temporary directory ${tmpDir}`)
    await fs.mkdirp(tmpDir)
    return tmpDir
  } else {
    if (fs.existsSync(destDir)) {
      const stat = fs.statSync(destDir)
      if (stat.isDirectory()) {
        return destDir
      } else {
        throw Error(`Expected directory: ${destDir}`)
      }
    } else {
      await fs.mkdirp(destDir)
      return destDir
    }
  }
}

async function ensureDestFile(
  dest?: string | tmp.FileOptions
): Promise<string> {
  if (typeof dest !== 'string') {
    const tmpFile = tmp.fileSync(dest).name
    logger.debug(`Created temporary file ${tmpFile}`)
    return tmpFile
  } else {
    if (fs.existsSync(dest)) {
      const stat = fs.statSync(dest)
      if (stat.isDirectory()) {
        const tmpFile = tmp.fileSync({ dir: dest }).name
        logger.debug(`Created temporary file ${tmpFile}`)
        return tmpFile
      } else if (stat.isFile()) {
        return dest
      } else {
        throw Error(`Expected file or directory: ${dest}`)
      }
    } else {
      const destDir = await ensureDestDir(path.dirname(dest))
      return path.join(destDir, path.basename(dest))
    }
  }
}

async function downloadAttempt(
  url: string,
  dest?: string | tmp.FileOptions
): Promise<string> {
  // Ensure we have a destination filepath:
  const outputFile = await ensureDestFile(dest)
  // Download the file:
  const response = await fetch.default(url)
  if (!response.ok || response.body === null) {
    throw new Error(`Could not download ${url}: ${response.statusText}`)
  } else {
    const outputStream = fs.createWriteStream(outputFile)
    await pipeline(response.body, outputStream)
    return new Promise<string>((resolve, reject) => {
      outputStream.close((error) => {
        if (error !== undefined && error !== null) reject(error)
        else resolve(outputFile)
      })
    })
  }
}

async function distDest(dist: Dist): Promise<string> {
  const url = typeof dist === 'string' ? dist : dist.url
  const dest = agdaupCacheDir(path.basename(new URL(url).pathname))
  const dir = await ensureDestDir(path.dirname(dest))
  assert(
    dir === path.dirname(dest),
    `ensureDestDir changed the directory: ${dir} !== ${path.dirname(dest)}`
  )
  return dest
}

export default async function downloadHelper(
  dist: Dist,
  destDir?: string | tmp.DirOptions
): Promise<string> {
  // Coerce string to {url: string}
  if (typeof dist === 'string') dist = { url: dist }
  // Use the caches directory for agdaup:
  destDir = await ensureDestDir(destDir)

  // Download package depending on the type of URL:
  logger.debug(`Downloading package from ${dist.url}`)
  switch (dist.distType ?? inferDistType(dist.url)) {
    case 'zip': {
      const source = await distDest(dist)
      assert(
        source === (await download(dist.url, source)),
        'download returned a different path'
      )
      await extractZip(source, destDir)
      break
    }
    case 'tgz': {
      const source = await distDest(dist)
      assert(
        source === (await download(dist.url, source)),
        'download returned a different path'
      )
      await extractTar(source, destDir, ['--extract', '--gzip'])
      break
    }
    case 'txz': {
      const source = await distDest(dist)
      assert(
        source === (await download(dist.url, source)),
        'download returned a different path'
      )
      await extractTar(source, destDir, ['--extract', '--xz'])
      break
    }
    case 'git': {
      await exec(
        'git',
        [
          ['clone'],
          ['--depth=1'],
          ['--single-branch'],
          dist.tag === undefined ? [] : ['--branch', dist.tag],
          [dist.url],
          [destDir]
        ].flat()
      )
      if (fs.existsSync(path.join(destDir, '.gitmodules'))) {
        await exec('git', ['submodule', 'init'], {
          cwd: destDir
        })
        await exec('git', ['submodule', 'update', '--depth=1'], {
          cwd: destDir
        })
      }
      break
    }
  }
  if (dist.dir !== undefined) {
    return path.join(destDir, dist.dir)
  } else {
    return destDir
  }
}

async function extractZip(source: string, destDir: string): Promise<void> {
  destDir = await ensureDestDir(destDir)

  // Extract the zip
  switch (platform) {
    case 'macos': {
      await unzip(['-q', '-o', source], { cwd: destDir })
      break
    }
    case 'linux': {
      await unzip(['-q', '-o', source], { cwd: destDir })
      break
    }
    case 'windows': {
      await unzipPwsh(source, destDir)
      break
    }
  }
}

async function unzipPwsh(source: string, destDir: string): Promise<void> {
  // Build the powershell command
  // Double-up single quotes, remove double quotes and newlines
  const escapedFile = source.replace(/'/g, "''").replace(/"|\n|\r/g, '')
  const escapedDest = destDir.replace(/'/g, "''").replace(/"|\n|\r/g, '')

  // To match the file overwrite behavior on nix systems, we use the overwrite = true
  // flag for ExtractToDirectory and the -Force flag for Expand-Archive as a fallback.
  // Attempt to use pwsh with ExtractToDirectory, if this fails attempt Expand-Archive
  if (await pwsh.exists()) {
    const pwshCommand = [
      `$ErrorActionPreference = 'Stop' ;`,
      `try { Add-Type -AssemblyName System.IO.Compression.ZipFile } catch { } ;`,
      `try { [System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`,
      `catch { if (($_.Exception.GetType().FullName -eq 'System.Management.Automation.MethodException') -or ($_.Exception.GetType().FullName -eq 'System.Management.Automation.RuntimeException') ){ Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force } else { throw $_ } } ;`
    ].join(' ')

    const args = [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Unrestricted',
      '-Command',
      pwshCommand
    ]
    await pwsh(args)
  } else if (await powershell.exists()) {
    const powershellCommand = [
      `$ErrorActionPreference = 'Stop' ;`,
      `try { Add-Type -AssemblyName System.IO.Compression.FileSystem } catch { } ;`,
      `if ((Get-Command -Name Expand-Archive -Module Microsoft.PowerShell.Archive -ErrorAction Ignore)) { Expand-Archive -LiteralPath '${escapedFile}' -DestinationPath '${escapedDest}' -Force }`,
      `else {[System.IO.Compression.ZipFile]::ExtractToDirectory('${escapedFile}', '${escapedDest}', $true) }`
    ].join(' ')

    const args = [
      '-NoLogo',
      '-Sta',
      '-NoProfile',
      '-NonInteractive',
      '-ExecutionPolicy',
      'Unrestricted',
      '-Command',
      powershellCommand
    ]
    await powershell(args)
  } else {
    throw Error(`Could not find pwsh or powershell.`)
  }
}

async function extractTar(
  source: string,
  destDir?: string,
  args?: string[]
): Promise<string> {
  destDir = await ensureDestDir(destDir)

  // Determine whether this is GNU tar
  logger.debug('Checking tar --version')
  const isGNU = await tar.isGNU()

  // Initialize args
  args = args ?? []

  // Use --force-local on Windows:
  if (platform === 'windows' && isGNU) args.push('--force-local')

  // Suppress warnings when using GNU tar to extract archives created by BSD tar:
  if (isGNU) {
    args.push('--warning=no-unknown-keyword')
    args.push('--overwrite')
  }

  if (platform === 'windows') {
    args.push(
      '-C',
      destDir.replace(/\\/g, '/'),
      '-f',
      source.replace(/\\/g, '/')
    )
  } else {
    args.push('-C', destDir, '-f', source)
  }
  await tar(args)
  return destDir
}

function inferDistType(url: string): DistType {
  // Check the file extension of the pathname
  const filename = new URL(url).pathname
  if (filename.endsWith('.zip')) return 'zip'
  if (filename.endsWith('.tgz')) return 'tgz'
  if (filename.endsWith('.tar.gz')) return 'tgz'
  if (filename.endsWith('.txz')) return 'txz'
  if (filename.endsWith('.tar.xz')) return 'txz'
  if (filename.endsWith('.git')) return 'git'
  // Match the URL:
  if (url.match(/\.zip/)) return 'zip'
  if (url.match(/\.tgz|\.tar\.gz/)) return 'tgz'
  if (url.match(/\.txz|\.tar\.xz/)) return 'txz'
  if (url.match(/\.git/)) return 'git'
  throw Error(`Could not guess how to download distribution from ${url}`)
}
