import {test, expect} from '@jest/globals'
import * as hackage from '../src/setup-agda/util/hackage'

test('test latest Agda version', async () => {
  expect(await hackage.getLatestVersion('Agda')).toEqual('2.6.2.2')
})
