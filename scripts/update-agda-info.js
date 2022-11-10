'use strict'
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        var desc = Object.getOwnPropertyDescriptor(m, k)
        if (
          !desc ||
          ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k]
            }
          }
        }
        Object.defineProperty(o, k2, desc)
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k
        o[k2] = m[k]
      })
var __setModuleDefault =
  (this && this.__setModuleDefault) ||
  (Object.create
    ? function (o, v) {
        Object.defineProperty(o, 'default', {enumerable: true, value: v})
      }
    : function (o, v) {
        o['default'] = v
      })
var __importStar =
  (this && this.__importStar) ||
  function (mod) {
    if (mod && mod.__esModule) return mod
    var result = {}
    if (mod != null)
      for (var k in mod)
        if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
          __createBinding(result, mod, k)
    __setModuleDefault(result, mod)
    return result
  }
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : {default: mod}
  }
Object.defineProperty(exports, '__esModule', {value: true})
const core = __importStar(require('@actions/core'))
const fs = __importStar(require('node:fs'))
const os = __importStar(require('node:os'))
const path = __importStar(require('node:path'))
const hackage = __importStar(require('../src/util/hackage'))
const ensure_error_1 = __importDefault(require('../src/util/ensure-error'))
const types_1 = require('../src/opts/types')
const object_pick_1 = __importDefault(require('object.pick'))
function run() {
  var _a, _b
  return __awaiter(this, void 0, void 0, function* () {
    try {
      const newCache = yield hackage.getPackageInfo('Agda')
      const oldLastModifiedTime = new Date(
        types_1.agdaPackageInfoCache.lastModified
      ).getTime()
      const newLastModifiedTime = new Date(newCache.lastModified).getTime()
      let failed = false
      let changed = false
      if (oldLastModifiedTime < newLastModifiedTime) {
        // Check if old versions are still available:`
        const versions = [
          ...Object.keys(types_1.agdaPackageInfoCache.packageInfo),
          ...Object.keys(newCache.packageInfo)
        ]
        for (const version of versions) {
          const oldStatus =
            (_a = types_1.agdaPackageInfoCache.packageInfo) === null ||
            _a === void 0
              ? void 0
              : _a[version]
          const newStatus =
            (_b = newCache.packageInfo) === null || _b === void 0
              ? void 0
              : _b[version]
          // Only the following automatic version status changes are allowed:
          // - undefined  -> normal
          // - normal     -> deprecated
          // - deprecated -> undefined
          // All others require human intervention.
          failed =
            failed || !versionStatusChangeOK(version, oldStatus, newStatus)
          changed = changed || oldStatus === newStatus
        }
        if (!failed) {
          // To help the TypeScript type inference,
          // we save the deprecated and normal versions separately
          core.info(`Updated Agda package info${os.EOL}`)
          fs.writeFileSync(
            path.join(
              __dirname,
              '..',
              'src',
              'data',
              'Agda.versions.deprecated.json'
            ),
            JSON.stringify({
              packageInfo: (0, object_pick_1.default)(
                newCache.packageInfo,
                versions.filter(v => newCache.packageInfo[v] === 'deprecated')
              ),
              lastModified: newCache.lastModified
            })
          )
          fs.writeFileSync(
            path.join(
              __dirname,
              '..',
              'src',
              'data',
              'Agda.versions.normal.json'
            ),
            JSON.stringify({
              packageInfo: (0, object_pick_1.default)(
                newCache.packageInfo,
                versions.filter(v => newCache.packageInfo[v] === 'normal')
              ),
              lastModified: newCache.lastModified
            })
          )
        } else {
          core.error(`refusing to update${os.EOL}`)
        }
      } else {
        core.error(`up-to-date${os.EOL}`)
      }
    } catch (error) {
      core.error((0, ensure_error_1.default)(error))
    }
  })
}
function versionStatusChangeOK(version, oldStatus, newStatus) {
  if (oldStatus === 'normal' && newStatus === undefined) {
    process.stderr.write(
      `Error: Agda version ${version} was normal, is now removed${os.EOL}`
    )
    // NOTE: no package should ever be removed without being deprecated; something has gone wrong
    return false
  } else if (oldStatus === 'normal' && newStatus === 'deprecated') {
    core.info(`Agda version ${version} was normal, is now deprecated${os.EOL}`)
  } else if (oldStatus === undefined && newStatus === 'normal') {
    core.info(`Agda version ${version} added as normal${os.EOL}`)
  } else if (oldStatus === undefined && newStatus === 'deprecated') {
    core.info(`Agda version ${version} added as deprecated${os.EOL}`)
  } else if (oldStatus === 'deprecated' && newStatus === undefined) {
    core.warning(
      `Agda version ${version} was deprecated, is now removed${os.EOL}`
    )
    // NOTE: no package should ever be removed EVEN IF deprecated; but we'll allow it
  } else if (oldStatus === 'deprecated' && newStatus === 'normal') {
    core.error(`Agda version ${version} was deprecated, is now normal${os.EOL}`)
    // NOTE: no package should ever be undeprecated; something has gone wrong
    return false
  } else if (oldStatus !== newStatus) {
    core.error(`unexpected status change ${oldStatus} -> ${newStatus}${os.EOL}`)
    // NOTE: the above should match any case where oldStatus !== newStatus,
    //       so either or both are not {normal, deprecated, undefined}
    return false
  }
  return true
}
run()
