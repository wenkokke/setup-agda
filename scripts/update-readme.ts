import * as nunjucks from 'nunjucks'
import * as yaml from 'js-yaml'
import * as path from 'node:path'
import * as fs from 'node:fs'

function main(): void {
  // Load action.yml:
  const actionYmlPath = path.join(__dirname, '..', 'action.yml')
  const actionYmlContents = fs.readFileSync(actionYmlPath).toString('utf-8')
  const actionYml = yaml.load(actionYmlContents) as object
  // Render README.md.njk
  nunjucks.configure({autoescape: false})
  const readmeMdNjkPath = path.join(__dirname, '..', 'README.md.njk')
  const readmeContents = nunjucks.render(readmeMdNjkPath, actionYml)
  // Write README.md
  const readmeMdPath = path.join(__dirname, '..', 'README.md')
  fs.writeFileSync(readmeMdPath, readmeContents)
}

main()
