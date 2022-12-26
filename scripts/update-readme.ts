import * as nunjucks from 'nunjucks'
import * as yaml from 'js-yaml'
import * as path from 'node:path'
import * as fs from 'node:fs'
import * as simver from '../src/util/simver'
import assert from 'node:assert'

function main(): void {
  // Load action.yml:
  const actionYml = loadActionYml()
  // Preprocess Agda.json for supported versions table:
  const supportedVersions = loadSupportedVersions()
  // Render README.md.njk
  const context = {...actionYml, supported: supportedVersions}
  nunjucks.configure({autoescape: false})
  const readmeMdNjkPath = path.join(__dirname, '..', 'README.md.njk')
  const readmeContents = nunjucks.render(readmeMdNjkPath, context)
  // Write README.md
  const readmeMdPath = path.join(__dirname, '..', 'README.md')
  fs.writeFileSync(readmeMdPath, readmeContents)
}

// Load action.yml:

function loadActionYml(): object {
  const actionYmlPath = path.join(__dirname, '..', 'action.yml')
  const actionYmlContents = fs.readFileSync(actionYmlPath).toString('utf-8')
  return yaml.load(actionYmlContents) as object
}

// Load supported versions:

type AgdaVersion = string

type Platform =
  | 'ubuntu-18.04'
  | 'ubuntu-20.04'
  | 'ubuntu-22.04'
  | 'macos-11'
  | 'macos-12'
  | 'macos-13'
  | 'windows-2019'
  | 'windows-2022'

const platforms: Platform[] = [
  'ubuntu-18.04',
  'ubuntu-20.04',
  'ubuntu-22.04',
  'macos-11',
  'macos-12',
  'macos-13',
  'windows-2019',
  'windows-2022'
]

type PlatformSupport = Record<Platform, {build: boolean; setup: boolean}>

function loadSupportedVersions(): {
  version: string
  support: PlatformSupport
}[] {
  // Load table of binary distribution URLs by Agda version:
  const agdaUrlsByVersion = loadAgdaUrlsByVersion()
  // Construct the supported versions table:
  const rows: {version: string; support: PlatformSupport}[] = []
  // For each Agda version, and each platform, determine compatibility:
  for (const {version, urls} of agdaUrlsByVersion) {
    const support = applyPlatformCompatibility(getPlatformSupport(urls))
    rows.push({version, support})
  }
  return rows
}

function getPlatformSupport(urls: string[]): PlatformSupport {
  const support: Partial<PlatformSupport> = {}
  for (const platform of platforms) {
    const build = urls.some(
      (value: string): boolean =>
        value !== undefined && value.includes(platform)
    )
    const setup = build
    support[platform] = {build, setup}
  }
  return support as PlatformSupport
}

function applyPlatformCompatibility(support: PlatformSupport): PlatformSupport {
  if (support['ubuntu-20.04'].setup) support['ubuntu-22.04'].setup = true
  // macos-11 -> macos-12
  if (support['macos-11'].setup) support['macos-12'].setup = true
  // macos-12 -> macos-13
  if (support['macos-12'].setup) support['macos-13'].setup = true
  // windows-2019 <-> windows-2022
  if (support['windows-2019'].setup) support['windows-2022'].setup = true
  else if (support['windows-2022'].setup) support['windows-2019'].setup = true
  return support
}

function loadAgdaUrlsByVersion(): {version: string; urls: string[]}[] {
  // Load Agda.json
  const agdaJsonPath = path.join(__dirname, '..', 'src', 'data', 'Agda.json')
  const agdaJsonContents = fs.readFileSync(agdaJsonPath).toString('utf-8')
  const agdaJson = JSON.parse(agdaJsonContents) as Record<string, object>

  // Get the Agda versions, and sort them in descending order:
  const agdaVersions = Object.keys(agdaJson).sort(simver.compare)

  // Get the urls for each Agda version:
  const agdaUrlsByVersion: {version: string; urls: string[]}[] = []
  for (const agdaVersion of agdaVersions) {
    const urlsForThisVersion: string[] = []
    const byPlatformTy = agdaJson[agdaVersion] as Record<string, object>
    for (const [_platform, byArch] of Object.entries(byPlatformTy)) {
      const byArchTy = byArch as Record<string, object>
      for (const [_arch, dist] of Object.entries(byArchTy)) {
        const distTy = dist as string | {url: string}
        urlsForThisVersion.push(
          typeof distTy === 'string' ? distTy : distTy.url
        )
      }
    }
    agdaUrlsByVersion.push({version: agdaVersion, urls: urlsForThisVersion})
  }
  return agdaUrlsByVersion
}

main()
