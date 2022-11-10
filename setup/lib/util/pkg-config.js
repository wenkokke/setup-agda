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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addPkgConfigPath = exports.pkgConfigGetInfo = exports.pkgConfig = void 0;
const core = __importStar(require("@actions/core"));
const os = __importStar(require("node:os"));
const exec = __importStar(require("./exec"));
const opts = __importStar(require("../opts"));
function pkgConfig(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('pkg-config', args);
    });
}
exports.pkgConfig = pkgConfig;
function pkgConfigGetList(name, listName) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield pkgConfig(`--print-${listName}`, name))
            .split(os.EOL)
            .map(variableName => variableName.trim())
            .filter(variableName => variableName !== '');
    });
}
function pkgConfigGetInfo(name, seen) {
    return __awaiter(this, void 0, void 0, function* () {
        if (seen === null || seen === void 0 ? void 0 : seen.includes(name)) {
            throw Error(`Cyclic dependency: ${seen.join(', ')}`);
        }
        else {
            const variables = {};
            for (const vn of yield pkgConfigGetList(name, 'variables'))
                variables[vn] = yield pkgConfig('--variable', vn, name);
            const requires = [];
            for (const rn of yield pkgConfigGetList(name, 'requires'))
                requires.push(yield pkgConfigGetInfo(rn, [...(seen !== null && seen !== void 0 ? seen : []), name]));
            return { name, variables, requires };
        }
    });
}
exports.pkgConfigGetInfo = pkgConfigGetInfo;
function addPkgConfigPath(pkgConfigDir) {
    var _a;
    const pathSep = opts.platform === 'win32' ? ';' : ':';
    const pkgConfigPath = (_a = process.env.PKG_CONFIG_PATH) !== null && _a !== void 0 ? _a : '';
    const pkgConfigDirs = pkgConfigPath.split(pathSep).filter(dir => dir !== '');
    core.exportVariable('PKG_CONFIG_PATH', [pkgConfigDir, ...pkgConfigDirs].join(pathSep));
}
exports.addPkgConfigPath = addPkgConfigPath;
