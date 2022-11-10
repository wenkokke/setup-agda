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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stackGetLocalBin = exports.stackGetVersion = exports.cabalMaybeGetVersion = exports.cabalGetVersion = exports.ghcMaybeGetVersion = exports.ghcGetVersion = exports.stack = exports.cabal = exports.ghc = exports.getGhcInfo = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("./exec"));
const ensure_error_1 = __importDefault(require("./ensure-error"));
function getGhcInfo(execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        let ghcInfoString = yield ghc(['--info'], execOptions);
        ghcInfoString = ghcInfoString.replace(/\(/g, '[').replace(/\)/g, ']');
        const ghcInfo = JSON.parse(ghcInfoString);
        return Object.fromEntries(ghcInfo.map(entry => [
            // "Target platform" -> 'ghc-info-target-platform'
            `ghc-info-${entry[0].toLowerCase().replace(/ /g, '-')}`,
            entry[1]
        ]));
    });
}
exports.getGhcInfo = getGhcInfo;
function ghc(args, execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('ghc', args, execOptions);
    });
}
exports.ghc = ghc;
function cabal(args, execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('cabal', args, execOptions);
    });
}
exports.cabal = cabal;
function stack(args, execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('stack', args, execOptions);
    });
}
exports.stack = stack;
function ghcGetVersion(using) {
    return __awaiter(this, void 0, void 0, function* () {
        if (using !== undefined &&
            using['enable-stack'] &&
            using['stack-no-global']) {
            const output = yield stack(['exec', 'ghc', '--', '--numeric-version'], {
                silent: true
            });
            return output.trim();
        }
        else {
            return exec.getVersion('ghc', {
                versionFlag: '--numeric-version',
                silent: true
            });
        }
    });
}
exports.ghcGetVersion = ghcGetVersion;
function ghcMaybeGetVersion(using) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield ghcGetVersion(using);
        }
        catch (error) {
            core.info(`Could not get installed GHC version: ${(0, ensure_error_1.default)(error).message}`);
            return null;
        }
    });
}
exports.ghcMaybeGetVersion = ghcMaybeGetVersion;
function cabalGetVersion(using) {
    return __awaiter(this, void 0, void 0, function* () {
        if (using !== undefined &&
            using['enable-stack'] &&
            using['stack-no-global']) {
            const output = yield stack(['exec', 'cabal', '--', '--numeric-version'], {
                silent: true
            });
            return output.trim();
        }
        else {
            return exec.getVersion('cabal', {
                versionFlag: '--numeric-version',
                silent: true
            });
        }
    });
}
exports.cabalGetVersion = cabalGetVersion;
function cabalMaybeGetVersion(using) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield cabalGetVersion(using);
        }
        catch (error) {
            core.info(`Could not get installed Cabal version: ${(0, ensure_error_1.default)(error).message}`);
            return null;
        }
    });
}
exports.cabalMaybeGetVersion = cabalMaybeGetVersion;
function stackGetVersion() {
    return __awaiter(this, void 0, void 0, function* () {
        return exec.getVersion('stack', {
            versionFlag: '--numeric-version',
            silent: true
        });
    });
}
exports.stackGetVersion = stackGetVersion;
function stackGetLocalBin(using) {
    return __awaiter(this, void 0, void 0, function* () {
        const stackLocalBin = yield stack([
            `--compiler=ghc-${using['ghc-version']}`,
            '--system-ghc',
            '--no-install-ghc',
            'path',
            '--local-bin'
        ]);
        return stackLocalBin.trim();
    });
}
exports.stackGetLocalBin = stackGetLocalBin;
