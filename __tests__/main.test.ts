import {test, expect} from '@jest/globals'
import * as agda from '../src/util/agda'

test('test latest Agda version', async () => {
  expect(await agda.getLatestVersion()).toEqual('2.6.2.2')
})
