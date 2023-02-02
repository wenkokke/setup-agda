import fs from 'fs-extra'
import ensureError from 'ensure-error'
import exec, { ExecOptions } from '../exec.js'

export default async function brew(
  args: string[],
  options?: ExecOptions
): Promise<void> {
  await exec('brew', args, options)
}

brew.getVersion = async (
  formula: string,
  options?: ExecOptions
): Promise<string> => {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  let formulaVersions = ''
  try {
    const { stdout } = await exec(
      'brew',
      ['list', '--formula', '--versions'],
      options
    )
    formulaVersions = stdout
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
  const { stdout } = await exec('brew', ['--prefix', formula], options)
  return fs.realpathSync(stdout.trim())
}
