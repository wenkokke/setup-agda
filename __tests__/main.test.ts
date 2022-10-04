import {test, expect} from '@jest/globals'
import {allBuilders, findBuilder} from '../src/util/version'

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
    expect(() => {
      const ghcVersion = builder.maxGhcVersionSatisfying()
      if (ghcVersion == null) {
        throw Error(`Could not find GHC version for Agda version ${builder.version}`)
      } else {
        return ghcVersion
      }
    }).not.toThrowError()
  }
})
