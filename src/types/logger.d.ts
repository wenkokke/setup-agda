declare let logger: {
  debug: (message: string) => void
  error: (message: string | Error) => void
  group: <T>(name: string, fn: () => Promise<T>) => Promise<T>
  info: (message: string) => void
  isDebug: () => boolean
  warning: (message: string | Error) => void
}
