import * as exec from '../exec'
import * as fs from 'node:fs'

export async function brew(...args: string[]): Promise<string> {
  return await exec.getOutput('brew', args)
}

export async function brewGetVersion(
  formula: string
): Promise<string | undefined> {
  const formulaVersionRegExp = new RegExp(`${formula} (?<version>[\\d._]+)`)
  const formulaVersions = await brew('list', '--formula', '--versions')
  return formulaVersions.match(formulaVersionRegExp)?.groups?.version?.trim()
}

export async function brewGetPrefixFor(formula: string): Promise<string> {
  let prefix = await brew('--prefix', formula)
  prefix = prefix.trim()
  prefix = fs.realpathSync(prefix)
  return prefix
}
