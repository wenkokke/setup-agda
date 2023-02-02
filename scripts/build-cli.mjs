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
  outExtension: { '.js': '.cjs' },
  define: {
    'logger.trace': 'logger_trace',
    'logger.debug': 'logger_debug',
    'logger.info': 'logger_info',
    'logger.warning': 'logger_warning',
    'logger.error': 'logger_error',
    'logger.fatal': 'logger_fatal',
    'logger.group': 'logger_group',
    'logger.isDebug': 'logger_isDebug',
    'logger.setVerbosity': 'logger_setVerbosity'
  },
  inject: ['./shim/logger-cli.mjs'],
  // The 'fsevents' package is an optional peerDependency for nunjucks,
  // but is not used. I believe it is safe to mark it as external.
  external: ['fsevents']
})
