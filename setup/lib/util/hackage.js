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
exports.getPackageSource = exports.resolvePackageVersion = exports.getPackageInfo = exports.mergePackageInfoCache = void 0;
const core = __importStar(require("@actions/core"));
const httpm = __importStar(require("@actions/http-client"));
const tc = __importStar(require("@actions/tool-cache"));
const node_assert_1 = __importDefault(require("node:assert"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const simver = __importStar(require("./simver"));
function mergePackageInfoCache(packageInfoCache1, packageInfoCache2) {
    const lastModifiedDate1 = new Date(packageInfoCache1.lastModified);
    const lastModifiedDate2 = new Date(packageInfoCache2.lastModified);
    return {
        packageInfo: Object.assign(Object.assign({}, packageInfoCache1.packageInfo), packageInfoCache2.packageInfo),
        lastModified: lastModifiedDate1.getTime() > lastModifiedDate2.getTime()
            ? packageInfoCache1.lastModified
            : packageInfoCache2.lastModified
    };
}
exports.mergePackageInfoCache = mergePackageInfoCache;
// Functions for getting package information:
function packageInfoUrl(packageName) {
    return `https://hackage.haskell.org/package/${packageName}.json`;
}
function packageUrl(packageName, packageVersion) {
    return `https://hackage.haskell.org/package/${packageName}-${packageVersion}/${packageName}-${packageVersion}.tar.gz`;
}
function getPackageInfo(packageName, options) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        const fetchPackageInfo = (_a = options === null || options === void 0 ? void 0 : options.fetchPackageInfo) !== null && _a !== void 0 ? _a : true;
        const returnCacheOnError = (_b = options === null || options === void 0 ? void 0 : options.returnCacheOnError) !== null && _b !== void 0 ? _b : true;
        const packageInfoCache = options === null || options === void 0 ? void 0 : options.packageInfoCache;
        if (fetchPackageInfo !== true && packageInfoCache === undefined) {
            throw Error('getPackageInfo: if fetchPackageInfo is false, packageInfoCache must be passed');
        }
        else if (returnCacheOnError !== true && packageInfoCache === undefined) {
            throw Error('getPackageInfo: if returnCacheOnError is false, packageInfoCache must be passed');
        }
        else if (fetchPackageInfo !== true && packageInfoCache !== undefined) {
            return packageInfoCache;
        }
        else {
            const httpClient = new httpm.HttpClient('setup-agda');
            const headers = (_c = options === null || options === void 0 ? void 0 : options.packageInfoHeaders) !== null && _c !== void 0 ? _c : {};
            if (packageInfoCache !== undefined) {
                headers['if-modified-since'] = packageInfoCache.lastModified;
            }
            const resp = yield httpClient.get(packageInfoUrl(packageName), headers);
            core.info(`getPackageInfo: received '${resp.message.statusCode}: ${resp.message.statusMessage}' for package ${packageName}`);
            if (resp.message.statusCode === 200) {
                const respBody = yield resp.readBody();
                const packageInfo = JSON.parse(respBody);
                return {
                    packageInfo,
                    lastModified: new Date(Date.now()).toUTCString()
                };
            }
            else if ((packageInfoCache === null || packageInfoCache === void 0 ? void 0 : packageInfoCache.packageInfo) !== undefined &&
                resp.message.statusCode === 304) {
                return packageInfoCache;
            }
            else {
                const errorMessage = [
                    `Could not get package info for ${packageName}:`,
                    `${resp.message.statusCode}: ${resp.message.statusMessage}`
                ].join(os.EOL);
                if (returnCacheOnError !== true && packageInfoCache !== undefined) {
                    core.warning(errorMessage);
                    return packageInfoCache;
                }
                else {
                    throw Error(errorMessage);
                }
            }
        }
    });
}
exports.getPackageInfo = getPackageInfo;
function getPackageLatestVersion(packageName, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const updatedPackageInfo = yield getPackageInfo(packageName, options);
        const versions = Object.keys(updatedPackageInfo.packageInfo)
            .filter(version => updatedPackageInfo.packageInfo[version] === 'normal')
            .map(simver.parse);
        const maxVersion = simver.max(versions);
        if (maxVersion === null) {
            throw Error(`Could not determine latest version from [${versions.join(', ')}]`);
        }
        else {
            return maxVersion;
        }
    });
}
function validatePackageVersion(packageName, packageVersion, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const packageInfo = yield getPackageInfo(packageName, options);
        const packageVersionStatus = packageInfo.packageInfo[packageVersion];
        if (packageVersionStatus === undefined) {
            throw Error(`Could not find ${packageName} version ${packageVersion}`);
        }
        else if (packageVersionStatus === 'deprecated') {
            throw Error(`${packageName} version ${packageVersion} is deprecated`);
        }
        else {
            (0, node_assert_1.default)(packageVersionStatus === 'normal', `Unexpected package version status for ${packageName}-${packageVersion}: ${packageVersionStatus}`);
            return packageVersion;
        }
    });
}
function resolvePackageVersion(packageName, packageVersion, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (packageVersion === 'latest') {
            return yield getPackageLatestVersion(packageName, options);
        }
        else {
            return yield validatePackageVersion(packageName, packageVersion, options);
        }
    });
}
exports.resolvePackageVersion = resolvePackageVersion;
function getPackageSource(packageName, options) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        let packageVersion = (_a = options === null || options === void 0 ? void 0 : options.packageVersion) !== null && _a !== void 0 ? _a : 'latest';
        const validateVersion = (_b = options === null || options === void 0 ? void 0 : options.validateVersion) !== null && _b !== void 0 ? _b : true;
        if (packageVersion === 'latest' || validateVersion) {
            packageVersion = yield resolvePackageVersion(packageName, packageVersion, options);
        }
        const packageArchive = yield tc.downloadTool(packageUrl(packageName, packageVersion), options === null || options === void 0 ? void 0 : options.archivePath, options === null || options === void 0 ? void 0 : options.downloadAuth, options === null || options === void 0 ? void 0 : options.downloadHeaders);
        let packageDir = yield tc.extractTar(packageArchive, options === null || options === void 0 ? void 0 : options.extractToPath, options === null || options === void 0 ? void 0 : options.tarFlags);
        packageDir = path.join(packageDir, `${packageName}-${packageVersion}`);
        return { packageVersion, packageDir };
    });
}
exports.getPackageSource = getPackageSource;
