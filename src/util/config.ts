import appDirs from 'appdirsjs'
import * as process from 'process'

export type Platform = 'linux' | 'darwin' | 'win32'

export const platform = process.platform as Platform

const agdaDirs = appDirs({appName: 'agda'})

export const cacheDir: string = agdaDirs.cache

export const installDir: string = agdaDirs.data
