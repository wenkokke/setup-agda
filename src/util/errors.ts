import { AgdaVersion, Dist } from './types.js'
import * as os from 'node:os'

export class AgdaLibraryUnsupportedSpecification extends Error {
  constructor(lib: string | URL) {
    if (typeof lib === 'string') {
      super(`Unsupported library specification: ${lib}`)
    } else {
      super(`Unsupported library specification: ${lib.href}`)
    }
    Object.setPrototypeOf(this, AgdaLibraryUnsupportedSpecification.prototype)
  }
}

export class AgdaLibraryMissingVersionTag extends Error {
  constructor(url: URL) {
    super(`Missing library version tag in ${url.href}`)
    Object.setPrototypeOf(this, AgdaLibraryMissingVersionTag.prototype)
  }
}

export class AgdaInstallDirExists extends Error {
  constructor(dir: string) {
    super(`Installation directory ${dir} exists`)
    Object.setPrototypeOf(this, AgdaInstallDirExists.prototype)
  }
}

export class AgdaLibNotFound extends Error {
  constructor(dir: string) {
    super(`Could not find an .agda-lib file in ${dir}`)
    Object.setPrototypeOf(this, AgdaLibNotFound.prototype)
  }
}

export class AgdaLicensesNotFound extends Error {
  constructor(dir: string) {
    super(
      [
        `Could not find licenses.txt in ${dir};`,
        `was this Agda version built with --license-report?`
      ].join(' ')
    )
    Object.setPrototypeOf(this, AgdaLicensesNotFound.prototype)
  }
}
export class AgdaRejectedDist extends Error {
  constructor(agdaVersion: AgdaVersion, dist: Dist, reason: Error) {
    if (reason instanceof AgdaRejectedDist) {
      super(reason.message)
    } else {
      if (typeof dist === 'string') dist = { url: dist }
      super(
        [
          `Rejected distribution for Agda ${agdaVersion} at ${dist.url}:`,
          reason.message
        ].join(os.EOL)
      )
    }
    Object.setPrototypeOf(this, AgdaRejectedDist.prototype)
  }
}

export class AgdaRejectedAllDists extends Error {
  constructor(agdaVersion: AgdaVersion) {
    super(`Rejected all distributions for Agda ${agdaVersion}`)
    Object.setPrototypeOf(this, AgdaRejectedAllDists.prototype)
  }
}

export class GhcNotFound extends Error {
  constructor(
    packageName: string,
    packageVersion: string,
    ghcVersionConstraint: string
  ) {
    super(
      [
        `${packageName} ${packageVersion} require GHC ${ghcVersionConstraint},`,
        `no GHC version could be found`
      ].join(' ')
    )
    Object.setPrototypeOf(this, GhcNotFound.prototype)
  }
}

export class GhcVersionConstraintNotFound extends Error {
  constructor(agdaVersion: AgdaVersion) {
    super(`Could not find GHC version constraint for Agda ${agdaVersion}`)
    Object.setPrototypeOf(this, GhcVersionConstraintNotFound.prototype)
  }
}

export class GhcVersionMismatch extends Error {
  constructor(
    packageName: string,
    packageVersion: string,
    ghcVersionConstraint: string,
    ghcVersion: string
  ) {
    super(
      [
        `${packageName} ${packageVersion} require GHC ${ghcVersionConstraint},`,
        `but the current GHC version is ${ghcVersion}`
      ].join(' ')
    )
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, GhcVersionMismatch.prototype)
  }
}
