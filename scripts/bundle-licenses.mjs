import glob from 'glob'
import * as fs from 'node:fs'
import * as path from 'node:path'
import url from 'url'
import prettier from 'prettier'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function main() {
  const licenseFiles = glob.sync(
    path.join(__dirname, '..', 'data', 'licenses', '*', '*')
  )
  const licenseData = {}
  for (const licenseFile of licenseFiles) {
    const packageName = path.basename(path.dirname(licenseFile))
    licenseData[packageName] = fs.readFileSync(licenseFile).toString()
  }
  const licenseDataFile = path.join(
    __dirname,
    '..',
    'src',
    'data',
    'licenses.json'
  )
  fs.writeFileSync(
    licenseDataFile,
    prettier.format(JSON.stringify({ licenses: licenseData }), {
      parser: 'json-stringify',
      filepath: licenseDataFile
    })
  )
}

main()
