export {
  debug as logger_trace,
  debug as logger_debug,
  info as logger_info,
  warning as logger_warning,
  error as logger_error,
  setFailed as logger_fatal,
  isDebug as logger_isDebug,
  group as logger_group
} from '@actions/core'

export function logger_setVerbosity(_verbosity) {
  /* empty */
}
