import esbuild from 'esbuild'

// Build action, cli, & scripts:
esbuild.build({
  entryPoints: ['./src/action.ts'],
  bundle: true,
  minify: true,
  legalComments: 'external',
  platform: 'node',
  target: 'node16',
  outdir: './dist',
  outExtension: { '.js': '.cjs' },
  define: {
    'logger.debug': 'logger_debug',
    'logger.error': 'logger_error',
    'logger.group': 'logger_group',
    'logger.info': 'logger_info',
    'logger.isDebug': 'logger_isDebug',
    'logger.warning': 'logger_warning'
  },
  inject: ['./shim/logger-action.mjs'],
  // The 'fsevents' package is an optional peerDependency for nunjucks,
  // but is not used. I believe it is safe to mark it as external.
  external: ['fsevents']
})
