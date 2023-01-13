import { platform } from '../util/platform.js'
import brew from '../util/deps/homebrew.js'
import pacman from '../util/deps/pacman.js'
import { icuGetVersion } from '../util/deps/icu.js'

/** Install ICU on a GitHub Runner. */
export default async function setupIcu(): Promise<{ 'icu-version': string }> {
  switch (platform) {
    case 'macos': {
      // Install ICU with Homebrew:
      await brew(['install', 'icu4c'])
      break
    }
    case 'linux': {
      break
    }
    case 'windows': {
      // Install pkg-config and ICU with Pacman:
      await pacman([
        '-v',
        '--noconfirm',
        '-Sy',
        'mingw-w64-x86_64-pkg-config',
        'mingw-w64-x86_64-icu'
      ])
      break
    }
  }
  return { 'icu-version': await icuGetVersion() }
}
