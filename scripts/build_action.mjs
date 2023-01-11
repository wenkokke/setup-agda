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
  define: {
    'logger.debug': 'logger_debug',
    'logger.endGroup': 'logger_endGroup',
    'logger.error': 'logger_error',
    'logger.info': 'logger_info',
    'logger.isDebug': 'logger_isDebug',
    'logger.startGroup': 'logger_startGroup',
    'logger.warning': 'logger_warning'
  },
  inject: ['./shim/logger-action.js']
})
