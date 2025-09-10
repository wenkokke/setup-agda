import pkg from 'pkg'

// Package cli as a standalone executable:
pkg.exec([
  './dist/cli.cjs',
  '--compress=GZip',
  '--target=node20-linux-x64,node20-macos-x64,node20-win-x64,node20-linux-arm64,node20-macos-arm64,node20-win-arm64',
  '--output=./dist/agdaup'
])
