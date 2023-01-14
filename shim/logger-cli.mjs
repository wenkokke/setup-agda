/* eslint-disable @typescript-eslint/no-empty-function */
import pino from 'pino'
import ensureError from 'ensure-error'

/** The global logger for the command-line application. */
let logger = undefined

function logger_instance() {
  if (logger === undefined) logger = pino()
  return logger
}

export function logger_debug(message) {
  logger_instance().debug({}, message)
}

export function logger_error(message) {
  const error = ensureError(message)
  logger_instance().error({ stack: error.stack }, error.message)
}

export function logger_info(message) {
  logger_instance().info({}, message)
}

export function logger_warning(message) {
  const error = ensureError(message)
  logger_instance().warn({ stack: error.stack }, error.message)
}

export async function logger_group(name, fn) {
  logger_info(name)
  return fn()
}
