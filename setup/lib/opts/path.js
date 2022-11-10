"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.libraryDir = exports.defaultsFile = exports.librariesDir = exports.librariesFile = exports.installDir = exports.cacheDir = exports.agdaDir = void 0;
const opts = __importStar(require("./platform"));
const path = __importStar(require("node:path"));
const os = __importStar(require("node:os"));
function agdaDir() {
    switch (opts.platform) {
        case 'linux':
        case 'darwin':
            return path.join(os.homedir(), '.agda');
        case 'win32':
            return path.join(os.homedir(), 'AppData', 'Roaming', 'agda');
    }
}
exports.agdaDir = agdaDir;
function cacheDir(name) {
    return path.join(agdaDir(), 'cache', `${name}-${yyyymmdd()}`);
}
exports.cacheDir = cacheDir;
function installDir(version) {
    return path.join(agdaDir(), 'agda', version);
}
exports.installDir = installDir;
function librariesFile() {
    return path.join(agdaDir(), 'libraries');
}
exports.librariesFile = librariesFile;
function librariesDir() {
    return path.join(agdaDir(), 'libraries.d');
}
exports.librariesDir = librariesDir;
function defaultsFile() {
    return path.join(agdaDir(), 'defaults');
}
exports.defaultsFile = defaultsFile;
function libraryDir(libraryName, libraryVersion, experimental = true) {
    if (experimental)
        libraryVersion += `-${yyyymmdd()}`;
    return path.join(librariesDir(), libraryName, libraryVersion);
}
exports.libraryDir = libraryDir;
function yyyymmdd() {
    const nowDate = new Date(Date.now());
    return [
        nowDate.getFullYear().toString().padStart(4, '0'),
        nowDate.getMonth().toString().padStart(2, '0'),
        nowDate.getDate().toString().padStart(2, '0')
    ].join('');
}
