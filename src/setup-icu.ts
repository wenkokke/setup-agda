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
