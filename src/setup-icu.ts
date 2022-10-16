import * as opts from './opts'
import {setupForLinux, bundleForLinux} from './setup-icu/linux'
import {setupForMacOS, bundleForMacOS} from './setup-icu/macos'
import {setupForWindows, bundleForWindows} from './setup-icu/windows'

export async function setup(options: opts.BuildOptions): Promise<void> {
  switch (opts.os) {
    case 'linux':
      return await setupForLinux(options)
    case 'macos':
      return await setupForMacOS(options)
    case 'windows':
      return await setupForWindows(options)
  }
}

// NOTE: This module hardcodes a number of assumptions about libicu which may
//       not always be true, e.g., library name starts with 'libicu', binaries
//       are linked against the major version on Linux and Windows but against
//       the entire version on MacOS, the internal dependencies of ICU, etc.

// NOTE: This module could be rewritten to be much closer to 'repairwheel' by
//       maintaining a list of allowed libraries (like 'manylinux') and using
//       `dumpbin`, `patchelf` and `otool` to find and bundle *all* libraries
//       that aren't on that list.

export async function bundle(
  distDir: string,
  options: opts.BuildOptions
): Promise<void> {
  switch (opts.os) {
    case 'linux':
      return await bundleForLinux(distDir, options)
    case 'macos':
      return await bundleForMacOS(distDir, options)
    case 'windows':
      return await bundleForWindows(distDir, options)
  }
}
