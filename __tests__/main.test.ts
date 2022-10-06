import {test, expect} from '@jest/globals'
import * as agda from '../src/util/agda'

test('test latest Agda version', async () => {
  expect(
    await agda.resolvePackageVersion('latest', {fetchPackageInfo: false})
  ).toEqual('2.6.2.2')
})
