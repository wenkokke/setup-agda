import fs from 'fs-extra'
import * as path from 'node:path'
import nunjucks from 'nunjucks'
import url from 'url'
import agdaVersions from '../src/data/Agda.versions.json' assert { type: 'json' }
import actionYml from '../src/data/setup-agda/action.json' assert { type: 'json' }

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function main() {
  // Load sample workflows:
  const samples = loadSampleWorkflows()
  // Preprocess Agda.json for supported versions table:
  const supportedVersions = loadSupportedVersions()
  // Render README.md.njk
  const context = {
    ...actionYml,
    knownPlatforms,
    supportedVersions,
    samples
  }
  nunjucks.configure({ autoescape: false })
  const readmeMdNjkPath = path.join(__dirname, '..', 'README.md.njk')
  const readmeContents = nunjucks.render(readmeMdNjkPath, context)
  // Write README.md
  const readmeMdPath = path.join(__dirname, '..', 'README.md')
  fs.writeFileSync(readmeMdPath, readmeContents)
}

// Load sample workflows:

const SAMPLE_WORKFLOWS = ['minimal', 'basic', 'matrix', 'complex']

function loadSampleWorkflows() {
  const samples = {}
  for (const sampleWorkflowName of SAMPLE_WORKFLOWS) {
    const sampleWorkflowPath = path.join(
      __dirname,
      '..',
      '.github',
      'workflows',
      `sample-${sampleWorkflowName}.yml`
    )
    const contents = fs.readFileSync(sampleWorkflowPath).toString()
    samples[sampleWorkflowName] = contents
  }
  return samples
}

// Load supported versions:

// NOTE: This order must correspond to the order in README.md.njk!
const knownPlatforms = [
  'ubuntu-20.04',
  'ubuntu-22.04',
  'macos-11',
  'macos-12',
  'windows-2019',
  'windows-2022'
]

function loadSupportedVersions() {
  // Load table of binary distribution URLs by Agda version:
  const agdaUrlsByVersion = loadAgdaUrlsByVersion()
  // Construct the supported versions table:
  const rows = []
  // For each Agda version, and each platform, determine compatibility:
  for (const { version, urls } of agdaUrlsByVersion) {
    const platforms = applyPlatformCompatibility(getPlatformSupport(urls))
    rows.push({ version, platforms })
  }
  return rows
}

function getPlatformSupport(urls) {
  const supported = {}
  for (const platform of knownPlatforms) {
    const build = urls.some(
      (value) => value !== undefined && value.includes(platform)
    )
    const setup = build
    supported[platform] = { build, setup }
  }
  return supported
}

function applyPlatformCompatibility(supported) {
  // ubuntu-20.04 -> ubuntu-22.04
  if (supported['ubuntu-20.04'].setup) supported['ubuntu-22.04'].setup = true
  // macos-11 -> macos-12
  if (supported['macos-11'].setup) supported['macos-12'].setup = true
  // windows-2019 -> windows-2022
  if (supported['windows-2019'].setup) supported['windows-2022'].setup = true
  // windows-2022 -> windows-2019
  if (supported['windows-2022'].setup) supported['windows-2019'].setup = true
  return supported
}

function urlList(obj) {
  if (typeof obj === 'string') {
    return obj
  } else if (typeof obj === 'object' && obj !== null) {
    if (Object.getOwnPropertyNames(obj).includes('url')) {
      return obj.url
    } else {
      return Object.values(obj).flatMap(urlList)
    }
  } else {
    return []
  }
}

function loadAgdaUrlsByVersion() {
  // Get the urls for each Agda version:
  const urlsByVersion = []
  for (const version of Object.keys(agdaVersions)) {
    if (version === 'nightly') {
      continue
    } else {
      const versionInfo = agdaVersions[version]
      const urls = urlList(versionInfo?.binary)
      if (urls.length !== 0) urlsByVersion.push({ version, urls })
    }
  }
  return urlsByVersion
}

main()
