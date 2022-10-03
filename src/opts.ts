import appDirs from 'appdirsjs'

export type Platform = 'linux' | 'darwin' | 'win32'

const agdaDirs = appDirs({appName: 'agda'})

export const cacheDir: string = agdaDirs.cache

export const installDir: string = agdaDirs.data
