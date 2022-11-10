import * as exec from './exec'

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
