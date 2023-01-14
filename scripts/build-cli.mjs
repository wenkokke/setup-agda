import esbuild from 'esbuild'

// Build action, cli, & scripts:
esbuild.build({
  entryPoints: ['./src/cli.ts'],
  bundle: true,
  minify: true,
  legalComments: 'external',
  platform: 'node',
  target: 'node16',
  outdir: './dist',
  define: {
    'logger.debug': 'logger_debug',
    'logger.error': 'logger_error',
    'logger.group': 'logger_group',
    'logger.info': 'logger_info',
    'logger.isDebug': 'logger_isDebug',
    'logger.warning': 'logger_warning'
  },
  inject: ['./shim/logger-cli.js'],
  // The 'fsevents' dependency is included as a peerDependency by nunjucks,
  // but is not used at either run- or compile-time. Therefore, I believe it
  // is safe to mark it as external.
  external: ['fsevents']
})
