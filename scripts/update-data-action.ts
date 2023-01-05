import * as yaml from 'js-yaml'
import * as path from 'node:path'
import * as fs from 'node:fs'

function main(): void {
  // Load action.yml:
  const actionYmlPath = path.join(__dirname, '..', 'action.yml')
  const actionYmlContents = fs.readFileSync(actionYmlPath).toString('utf-8')
  const actionYml = yaml.load(actionYmlContents) as object
  // Write action.json
  const actionJsonPath = path.join(
    __dirname,
    '..',
    'src',
    'data',
    'action.json'
  )
  const actionJsonContents = JSON.stringify(actionYml, undefined, 2)
  fs.writeFileSync(actionJsonPath, actionJsonContents)
}

main()
