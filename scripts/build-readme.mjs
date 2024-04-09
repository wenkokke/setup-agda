import fs from 'fs-extra'
import * as path from 'node:path'
import nunjucks from 'nunjucks'
import url from 'url'
import agdaVersions from '../src/data/Agda.versions.json' assert { type: 'json' }
import actionYml from '../src/data/setup-agda/action.json' assert { type: 'json' }
import { markdownTable } from 'markdown-table'

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

function main() {
  // Load sample workflows:
  const samples = loadSampleWorkflows()
  // Preprocess Agda.json for supported versions table:
  const support = buildSupportedTable()
  // Render README.md.njk
  const context = {
    ...actionYml,
    support,
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
const knownPlatforms = {
  ubuntu: {
    archs: ['x64'],
    releases: ['20.04', '22.04']
  },
  macos: {
    archs: ['x64', 'arm64'],
    releases: ['11', '12', '13', '14']
  },
  windows: {
    archs: ['x64'],
    releases: ['2019', '2022']
  }
}

function buildSupportedTable() {
  // Load table of binary distribution URLs by Agda version:
  const agdaUrlsByVersion = loadAgdaUrlsByVersion()
  // Construct the supported versions table:
  const table = [
    ['Agda', 'Ubuntu', 'macOS (Intel)', 'macOS (Apple)', 'Windows']
  ]
  const align = ['l', 'c', 'c', 'c', 'c']
  // For each Agda version, and each platform, determine compatibility:
  for (const { version, urls } of agdaUrlsByVersion) {
    const releases = buildSupportTableRow(urls)
    table.push([version, ...releases])
  }
  return markdownTable(table, { align })
}

function buildSupportTableRow(urls) {
  const row = []
  for (const vendor of Object.keys(knownPlatforms)) {
    for (const arch of knownPlatforms[vendor].archs) {
      const supportedReleases = knownPlatforms[vendor].releases.filter(
        (release) => isPlatformSupported(urls, { vendor, release, arch })
      )
      const minimumSupportedRelease = minimumRelease(vendor, supportedReleases)
      if (typeof minimumSupportedRelease === 'string') {
        row.push(`>=${minimumSupportedRelease}`)
      } else {
        row.push('')
      }
    }
  }
  return row
}

function isPlatformSupported(urls, { vendor, release, arch }) {
  return urls.some(
    (value) =>
      value !== undefined && value.includes(`${arch}-${vendor}-${release}`)
  )
}

function applyBackwardsCompatibility(vendor, release) {
  if (vendor === 'windows' && release === '2022') {
    return '2019'
  } else {
    return release
  }
}

function minimumRelease(vendor, releases) {
  if (Array.isArray(releases)) {
    return applyBackwardsCompatibility(vendor, releases.sort().at(0))
  } else {
    return null
  }
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
