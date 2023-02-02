import * as fs from 'node:fs'
import ensureError from 'ensure-error'
import exec, { ExecOptions } from '../exec.js'

export default async function brew(
  args: string[],
  options?: ExecOptions
): Promise<string> {
  return await exec('brew', args, options)
}

brew.getVersion = async (
  formula: string,
  options?: ExecOptions
): Promise<string> => {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  let formulaVersions = ''
  try {
    formulaVersions = await brew(['list', '--formula', '--versions'], options)
  } catch (error) {
    throw Error(`Could not get version for ${formula}: ${ensureError(error)}`)
  }
  const formulaVersion = formulaVersions
    .match(formulaVersionRegExp)
    ?.groups?.version?.trim()
  if (formulaVersion !== undefined) return formulaVersion
  else throw Error(`Formula ${formula} is not installed`)
}

brew.getPrefix = async (
  formula: string,
  options?: ExecOptions
): Promise<string> => {
  let prefix = await brew(['--prefix', formula], options)
  prefix = prefix.trim()
  prefix = fs.realpathSync(prefix)
  return prefix
}
