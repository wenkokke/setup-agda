import * as core from '@actions/core'
import * as tc from '@actions/tool-cache'
import * as opts from './types'
import * as httpm from 'node:http'
import * as path from 'node:path'

export default async function downloadDistIndexEntry(
  entry: opts.DistIndexEntry,
  dest?: string,
  auth?: string | undefined,
  headers?: httpm.OutgoingHttpHeaders | undefined
): Promise<string> {
  if (typeof entry === 'string') entry = {url: entry}
  core.info(`Downloading package from ${entry.url}`)
  const archive = await tc.downloadTool(entry.url, undefined, auth, headers)
  let dir: string | undefined = undefined
  if (entry.url.match(/\.zip$/)) {
    dir = await tc.extractZip(archive, dest)
  } else if (entry.url.match(/(\.tar\.gz|\.tgz)$/)) {
    dir = await tc.extractTar(archive, dest, ['--extract', '--gzip'])
  } else if (entry.url.match(/(\.tar\.xz|\.txz)$/)) {
    dir = await tc.extractTar(archive, dest, ['--extract', '--xz'])
  } else {
    throw Error(`Do not know how to extract archive: ${entry.url}`)
  }
  if (entry.dir !== undefined) dir = path.join(dir, entry.dir)
  return dir
}
