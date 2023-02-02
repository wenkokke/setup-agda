import LineByLineReader from 'line-by-line'
import { Readable } from 'node:stream'

export function log(message: string, verbosity?: Verbosity): void {
  if (verbosity !== undefined && verbosity !== 'silent') {
    switch (verbosity) {
      case 'trace':
        return logger.trace(message)
      case 'debug':
        return logger.debug(message)
      case 'info':
        return logger.info(message)
      case 'warning':
        return logger.warning(message)
      case 'error':
        return logger.error(message)
      case 'fatal':
        return logger.fatal(message)
    }
  }
}

export function logStream(stream: Readable, verbosity?: Verbosity): void {
  if (verbosity !== undefined && verbosity !== 'silent') {
    const lr = new LineByLineReader(stream)
    lr.on('error', logger.error)
    lr.on('line', (line) => log(line, verbosity))
  }
}
