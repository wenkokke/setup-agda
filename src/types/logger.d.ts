type Verbosity =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warning'
  | 'error'
  | 'fatal'
  | 'silent'

declare let logger: {
  trace: (message: string) => void
  debug: (message: string) => void
  info: (message: string) => void
  warning: (message: string | Error) => void
  error: (message: string | Error) => void
  fatal: (message: string | Error) => void
  group: <T>(name: string, fn: () => Promise<T>) => Promise<T>
  isDebug: () => boolean
  setVerbosity: (verbosity: Verbosity) => void
}
