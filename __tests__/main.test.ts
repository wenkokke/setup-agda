import {test, expect} from '@jest/globals'
import {
  AgdaVersion,
  allBuilders,
  findBuilder,
  resolveAgdaVersion
} from '../src/util/version'
import {resolveGhcVersion} from '../src/setup-agda/version'

test('latest version', async () => {
  const builder = await findBuilder()
  expect(builder?.version.toString()).toBe('2.6.2.2')
})

test('known versions of Agda are valid', async () => {
  for (const builder of allBuilders) {
    expect(() => builder.version.toString()).not.toThrowError()
  }
})

test('known versions of Agda have valid GHC versions', async () => {
  for (const builder of allBuilders) {
    expect(() => builder.maxGhcVersionSatisfying()).not.toThrowError()
  }
})

const specsAndVersions = [
  ['2.6.2', '2.6.2.2'],
  ['2.6.2.0', '2.6.2'],
  ['2.5.4', '2.5.4.2.20190330']
]

test('resolve Agda versions', async () => {
  for (const [spec, version] of specsAndVersions) {
    expect(
      (() => {
        const builder = resolveAgdaVersion(spec)
        return `[${spec}, ${builder?.version}]`
      })()
    ).toBe(`[${spec}, ${version}]`)
  }
})

const strangeAgdaVersionStrings = [
  {
    versionString: '2.4.2.2.20150518',
    buildString: '20150518'
  },
  {
    versionString: '2.4.2.3.20150913',
    buildString: '20150913'
  },
  {
    versionString: '2.4.2.4.20151210',
    buildString: '20151210'
  },
  {
    versionString: '2.5.0.20160213',
    buildString: '20160213'
  },
  {
    versionString: '2.5.0.20160412',
    buildString: '20160412'
  },
  {
    versionString: '2.5.1.1-rc1',
    releaseTag: 'rc1'
  },
  {
    versionString: '2.5.1.2.20161216',
    buildString: '20161216'
  },
  {
    versionString: '2.5.2.20170816',
    buildString: '20170816'
  },
  {
    versionString: '2.5.3.20180519',
    buildString: '20180519'
  },
  {
    versionString: '2.5.3.20180526',
    buildString: '20180526'
  },
  {
    versionString: '2.5.4.1.20181026',
    buildString: '20181026'
  },
  {
    versionString: '2.5.4.1.20181027',
    buildString: '20181027'
  },
  {
    versionString: '2.5.4.2.20190217',
    buildString: '20190217'
  },
  {
    versionString: '2.5.4.2.20190310',
    buildString: '20190310'
  },
  {
    versionString: '2.5.4.2.20190330',
    buildString: '20190330'
  },
  {
    versionString: '2.6.0.1.20191219',
    buildString: '20191219'
  },
  {
    versionString: '2.6.0.1.20200307',
    buildString: '20200307'
  },
  {
    versionString: '2.6.1.3.20210524',
    buildString: '20210524'
  },
  {
    versionString: '2.6.1.3.20210605',
    buildString: '20210605'
  }
]

test('parse strange Agda versions', async () => {
  for (const {
    versionString,
    buildString,
    releaseTag
  } of strangeAgdaVersionStrings) {
    expect(
      (() => {
        const version = new AgdaVersion(versionString)
        return `[${versionString}, ${version.buildString}, ${version.releaseTag}]`
      })()
    ).toBe(`[${versionString}, ${buildString}, ${releaseTag}]`)
  }
})
