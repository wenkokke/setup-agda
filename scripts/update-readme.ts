import * as nunjucks from 'nunjucks'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as simver from '../src/util/simver'
import action from '../src/data/action.json'

function main(): void {
  // Load sample workflows:
  const samples = loadSampleWorkflows()
  // Preprocess Agda.json for supported versions table:
  const supported_versions = loadSupportedVersions()
  // Render README.md.njk
  const context = {...action, known_platforms, supported_versions, samples}
  nunjucks.configure({autoescape: false})
  const readmeMdNjkPath = path.join(__dirname, '..', 'README.md.njk')
  const readmeContents = nunjucks.render(readmeMdNjkPath, context)
  // Write README.md
  const readmeMdPath = path.join(__dirname, '..', 'README.md')
  fs.writeFileSync(readmeMdPath, readmeContents)
}

// Load sample workflows:

const SAMPLE_WORKFLOWS = ['minimal', 'basic', 'matrix', 'complex']

function loadSampleWorkflows(): Partial<Record<string, string>> {
  const samples: Partial<Record<string, string>> = {}
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

type Platform =
  | 'ubuntu-18.04'
  | 'ubuntu-20.04'
  | 'ubuntu-22.04'
  | 'macos-11'
  | 'macos-12'
  | 'windows-2019'
  | 'windows-2022'

// NOTE: This order must correspond to the order in README.md.njk!
const known_platforms: Platform[] = [
  'ubuntu-18.04',
  'ubuntu-20.04',
  'ubuntu-22.04',
  'macos-11',
  'macos-12',
  'windows-2019',
  'windows-2022'
]

type PlatformSupport = Record<Platform, {build: boolean; setup: boolean}>

function loadSupportedVersions(): {
  version: string
  platforms: PlatformSupport
}[] {
  // Load table of binary distribution URLs by Agda version:
  const agdaUrlsByVersion = loadAgdaUrlsByVersion()
  // Construct the supported versions table:
  const rows: {version: string; platforms: PlatformSupport}[] = []
  // For each Agda version, and each platform, determine compatibility:
  for (const {version, urls} of agdaUrlsByVersion) {
    const platforms = applyPlatformCompatibility(getPlatformSupport(urls))
    rows.push({version, platforms})
  }
  return rows
}

function getPlatformSupport(urls: string[]): PlatformSupport {
  const supported: Partial<PlatformSupport> = {}
  for (const platform of known_platforms) {
    const build = urls.some(
      (value: string): boolean =>
        value !== undefined && value.includes(platform)
    )
    const setup = build
    supported[platform] = {build, setup}
  }
  return supported as PlatformSupport
}

function applyPlatformCompatibility(
  supported: PlatformSupport
): PlatformSupport {
  if (supported['ubuntu-20.04'].setup) supported['ubuntu-22.04'].setup = true
  // macos-11 -> macos-12
  if (supported['macos-11'].setup) supported['macos-12'].setup = true
  // windows-2019 -> windows-2022
  if (supported['windows-2019'].setup) supported['windows-2022'].setup = true
  // windows-2019 <- windows-2022
  if (supported['windows-2022'].setup) supported['windows-2019'].setup = true
  return supported
}

function loadAgdaUrlsByVersion(): {version: string; urls: string[]}[] {
  // Load Agda.json
  const agdaJsonPath = path.join(__dirname, '..', 'src', 'data', 'Agda.json')
  const agdaJsonContents = fs.readFileSync(agdaJsonPath).toString('utf-8')
  const agdaJson = JSON.parse(agdaJsonContents) as Record<string, object>

  // Get the Agda versions, and sort them in descending order:
  const agdaVersions = Object.keys(agdaJson).sort(simver.compare).reverse()

  // Get the urls for each Agda version:
  const agdaUrlsByVersion: {version: string; urls: string[]}[] = []
  for (const agdaVersion of agdaVersions) {
    const urlsForThisVersion: string[] = []
    const versionInfo = agdaJson[agdaVersion] as {
      binary?: Record<string, object>
    }
    if (versionInfo?.binary !== undefined) {
      for (const [_platform, byArch] of Object.entries(versionInfo.binary)) {
        for (const [_arch, dists] of Object.entries(byArch)) {
          for (const dist of dists as (string | {url: string})[]) {
            urlsForThisVersion.push(typeof dist === 'string' ? dist : dist.url)
          }
        }
      }
    }
    // Only push if there are known URLs for this version, and the version isn't nightly:
    if (agdaVersion !== 'nightly' && urlsForThisVersion.length !== 0) {
      agdaUrlsByVersion.push({version: agdaVersion, urls: urlsForThisVersion})
    }
  }
  return agdaUrlsByVersion
}

main()
