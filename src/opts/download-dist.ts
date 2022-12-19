import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as opts from './types'
import * as crypto from 'node:crypto'
import {setupAgdaCacheDir} from './appdirs'
import * as httpm from 'node:http'
import * as path from 'node:path'
import * as util from '../util'

export default async function downloadDist(
  entry: opts.Dist,
  dest?: string,
  auth?: string | undefined,
  headers?: httpm.OutgoingHttpHeaders | undefined
): Promise<string> {
  // Coerce string to {url: string; dir?: string; tag?: string}
  if (typeof entry === 'string') entry = {url: entry}

  // Download package depending on the type of URL:
  core.info(`Downloading package from ${entry.url}`)
  switch (entry.distType ?? inferDistType(entry.url)) {
    case 'zip': {
      const arc = await tc.downloadTool(entry.url, undefined, auth, headers)
      dest = await tc.extractZip(arc, dest)
      break
    }
    case 'tgz': {
      const arc = await tc.downloadTool(entry.url, undefined, auth, headers)
      dest = await tc.extractTar(arc, dest, ['--extract', '--gzip'])
      break
    }
    case 'txz': {
      const arc = await tc.downloadTool(entry.url, undefined, auth, headers)
      dest = await tc.extractTar(arc, dest, ['--extract', '--xz'])
      break
    }
    case 'git': {
      if (dest === undefined) {
        dest = setupAgdaCacheDir(
          crypto.createHash('sha256').update(entry.url).digest('hex')
        )
      }
      await util.getOutput(
        'git',
        [
          ['clone'],
          ['--depth=1'],
          ['--single-branch'],
          entry.tag === undefined ? [] : ['--branch', entry.tag],
          [entry.url],
          [dest]
        ].flat()
      )
      break
    }
  }
  if (entry.dir !== undefined) dest = path.join(dest, entry.dir)
  return dest
}

function inferDistType(url: string): opts.DistType {
  if (url.match(/\.zip$/)) return 'zip'
  if (url.match(/\.tgz$|\.tar\.gz$/)) return 'tgz'
  if (url.match(/\.txz$|\.tar\.xz/)) return 'txz'
  if (url.match(/\.git$/)) return 'git'
  throw Error(`Could not guess how to download distribution from ${url}`)
}
