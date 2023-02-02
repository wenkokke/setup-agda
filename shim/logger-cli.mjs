/* eslint-disable @typescript-eslint/no-empty-function */
import pino from 'pino'
import pinoPretty from 'pino-pretty'
import ensureError from 'ensure-error'

/** The global logger for the command-line application. */
let logger = undefined

function logger_instance() {
  if (logger === undefined) {
    logger = pino(
      pinoPretty({
        colorize: true,
        include: 'level',
        messageKey: 'msg',
        messageFormat: `{msg}`
      })
    )
  }
  return logger
}

const VERBOSITY_MAPPING = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Infinity
}

export function logger_trace(message) {
  logger_instance().trace({}, message)
}

export function logger_debug(message) {
  logger_instance().debug({}, message)
}

export function logger_info(message) {
  logger_instance().info({}, message)
}

export function logger_warning(message) {
  if (typeof message === 'string') {
    logger_instance().warn({}, message)
  } else {
    const error = ensureError(message)
    logger_instance().warn({ stack: error.stack }, error.message)
  }
}

export function logger_error(message) {
  if (typeof message === 'string') {
    logger_instance().error({}, message)
  } else {
    const error = ensureError(message)
    logger_instance().error({ stack: error.stack }, error.message)
  }
}

export function logger_fatal(message) {
  if (typeof message === 'string') {
    logger_instance().fatal({}, message)
  } else {
    const error = ensureError(message)
    logger_instance().fatal({ stack: error.stack }, error.message)
  }
}

export async function logger_group(name, fn) {
  logger_info(name)
  return fn()
}

export function logger_isDebug() {
  logger_instance().isLevelEnabled(VERBOSITY_MAPPING.debug)
}

export function logger_setVerbosity(verbosity) {
  try {
    const level = VERBOSITY_MAPPING[verbosity]
    logger_instance().level = level
  } catch (error) {
    logger_error(error)
  }
}
