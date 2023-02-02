/* eslint-disable @typescript-eslint/no-empty-function */
import pino from 'pino'
import pinoPretty, { colorizerFactory } from 'pino-pretty'
import ensureError from 'ensure-error'

/** The global logger for the command-line application. */
let logger = undefined

const DEFAULT_VERBOSITY = 'info'

const verbosityToLevel = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
  silent: Infinity
}
const levelToVerbosity = Object.fromEntries(
  Object.entries(verbosityToLevel).map((value) => value.reverse())
)

const levelColorizer = colorizerFactory(true)

function logger_instance() {
  if (logger === undefined) {
    logger = pino(
      pinoPretty({
        colorize: true,
        include: '',
        messageKey: 'msg',
        messageFormat: (log, messageKey) => {
          const msg = log[messageKey]
          const level = log.level
          const verbosity = levelToVerbosity[level] ?? DEFAULT_VERBOSITY
          if (verbosity === DEFAULT_VERBOSITY) {
            return msg
          } else {
            return `${levelColorizer(level)}: ${msg}`
          }
        }
      })
    )
  }
  return logger
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
  logger_instance().isLevelEnabled(verbosityToLevel.debug)
}

export function logger_setVerbosity(verbosity) {
  if (typeof verbosity === 'string') {
    verbosity = verbosity.toLowerCase()
  } else {
    logger_warning(`Unknown verbosity ${JSON.stringify(verbosity)}`)
    verbosity = DEFAULT_VERBOSITY
  }
  try {
    const level = verbosityToLevel[verbosity]
    logger_instance().level = level
  } catch (error) {
    logger_error(error)
  }
}
