import pkg from 'pkg'

// Package cli as a standalone executable:
pkg.exec([
  './dist/cli.cjs',
  '--compress=GZip',
  '--target=node16-linux-x64,node16-macos-x64,node16-win-x64,node16-linux-arm64,node16-macos-arm64,node16-win-arm64',
  '--output=./dist/agdaup'
])
