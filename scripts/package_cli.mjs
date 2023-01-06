import pkg from 'pkg'

// Package cli as a standalone executable:
pkg.exec([
  './dist/cli.js',
  '--compress=GZip',
  '--target=node16-linux-x64,node16-macos-x64,node16-win-x64',
  '--output=./dist/agdaup'
])
