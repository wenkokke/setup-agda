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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const path = __importStar(require("node:path"));
const opts = __importStar(require("../opts"));
const util = __importStar(require("../util"));
function installFromBdist(options) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        // If 'agda-version' is 'HEAD' we must build from source:
        if (options['agda-version'] === 'HEAD')
            return null;
        // Download & extract package:
        try {
            const bdistIndexEntry = (_c = (_b = (_a = opts.agdaBdistIndex) === null || _a === void 0 ? void 0 : _a[opts.platform]) === null || _b === void 0 ? void 0 : _b[opts.arch]) === null || _c === void 0 ? void 0 : _c[options['agda-version']];
            if (bdistIndexEntry === undefined) {
                core.info([
                    `Could not find binary distribution for`,
                    `Agda ${options['agda-version']} on ${opts.arch}-${opts.platform}`
                ].join(' '));
                return null;
            }
            try {
                const bdistDir = yield opts.downloadDistIndexEntry(bdistIndexEntry);
                // If needed, repair file permissions:
                yield repairPermissions(bdistDir);
                // Test package:
                core.info(`Testing Agda ${options['agda-version']} package`);
                try {
                    yield util.agdaTest({
                        agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
                        agdaDataDir: path.join(bdistDir, 'data')
                    });
                    return bdistDir;
                }
                catch (error) {
                    const warning = util.ensureError(error);
                    warning.message = `Rejecting Agda ${options['agda-version']} package: ${warning.message}`;
                    core.warning(warning);
                    return null;
                }
            }
            catch (error) {
                core.warning(`Failed to download package: ${util.ensureError(error).message}`);
                return null;
            }
        }
        catch (error) {
            core.warning(util.ensureError(error));
            return null;
        }
    });
}
exports.default = installFromBdist;
function repairPermissions(bdistDir) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        switch (opts.platform) {
            case 'linux': {
                // Repair file permissions
                core.info('Repairing file permissions');
                for (const binName of util.agdaBinNames) {
                    yield util.chmod('+x', path.join(bdistDir, 'bin', binName));
                }
                break;
            }
            case 'darwin': {
                // Repair file permissions
                core.info('Repairing file permissions');
                // Repair file permissions on executables
                for (const binName of util.agdaBinNames) {
                    yield util.chmod('+x', path.join(bdistDir, 'bin', binName));
                    yield util.xattr('-c', path.join(bdistDir, 'bin', binName));
                }
                // Repair file permissions on libraries
                const libGlobber = yield glob.create(path.join(bdistDir, 'lib', '*'));
                try {
                    for (var _b = __asyncValues(libGlobber.globGenerator()), _c; _c = yield _b.next(), !_c.done;) {
                        const libPath = _c.value;
                        yield util.chmod('+w', libPath);
                        yield util.xattr('-c', libPath);
                        yield util.chmod('-w', libPath);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                break;
            }
        }
    });
}
