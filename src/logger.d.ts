declare let logger: {
  debug: (message: string) => void
  endGroup: () => void
  error: (message: string | Error) => void
  info: (message: string) => void
  isDebug: () => boolean
  startGroup: (name: string) => void
  warning: (message: string | Error) => void
}
