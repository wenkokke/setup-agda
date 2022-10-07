import {test, expect} from '@jest/globals'
import * as agda from '../src/util/agda'
import * as hackage from '../src/util/hackage'

test('test latest Agda version', async () => {
  expect(
    await hackage.resolvePackageVersion('Agda', 'latest', {
      fetchPackageInfo: false,
      packageInfoCache: agda.packageInfoCache
    })
  ).toEqual('2.6.2.2')
})
