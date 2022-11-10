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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configureEnvFor = exports.agdaTest = exports.agda = exports.agdaGetDataDir = exports.agdaGetVersion = exports.agdaBinNames = exports.agdaModeBinName = exports.agdaBinName = exports.getAgdaSdist = exports.registerAgdaLibrary = exports.readDefaultsSync = exports.readLibrariesSync = void 0;
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const path = __importStar(require("node:path"));
const opts = __importStar(require("../opts"));
const exec = __importStar(require("./exec"));
const simver = __importStar(require("./simver"));
const hackage = __importStar(require("./hackage"));
const node_assert_1 = __importDefault(require("node:assert"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
// Agda utilities
function readLibrariesSync() {
    if (!fs.existsSync(opts.librariesFile()))
        return [];
    const librariesFileContents = fs.readFileSync(opts.librariesFile()).toString();
    const libraries = librariesFileContents.split(/\r\n|\r|\n/g);
    return libraries.map(libraryPath => path.parse(libraryPath));
}
exports.readLibrariesSync = readLibrariesSync;
function readDefaultsSync() {
    if (!fs.existsSync(opts.defaultsFile()))
        return [];
    const defaultsFileContents = fs.readFileSync(opts.defaultsFile()).toString();
    return defaultsFileContents.split(/\r\n|\r|\n/g);
}
exports.readDefaultsSync = readDefaultsSync;
function registerAgdaLibrary(libraryFile, isDefault = false) {
    // Check agdaLibraryFile exists & refers to an agda-lib file:
    (0, node_assert_1.default)(fs.existsSync(libraryFile));
    const newLibrary = path.parse(path.resolve(libraryFile));
    (0, node_assert_1.default)(newLibrary.ext === '.agda-lib');
    // Load the current libraries file:
    const oldLibraries = readLibrariesSync();
    if (oldLibraries.some(oldLibrary => oldLibrary.name === newLibrary.name))
        core.warning(`Agda libraries file already contains a copy of ${newLibrary.name}`);
    const newLibraries = [...oldLibraries, newLibrary];
    fs.writeFileSync(opts.librariesFile(), newLibraries
        .map(libraryParsedPath => path.format(libraryParsedPath))
        .join(os.EOL));
    // Add the library to defaults:
    if (isDefault === true) {
        const oldDefaults = readDefaultsSync();
        const newDefaults = [...oldDefaults, newLibrary.base];
        fs.writeFileSync(opts.defaultsFile(), newDefaults.join(os.EOL));
    }
}
exports.registerAgdaLibrary = registerAgdaLibrary;
function getAgdaSdist(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Throw an error if the 'agda-version' is 'nightly':
        if (options['agda-version'] === 'nightly')
            throw Error('Cannot get source distribution for Agda version "nightly"');
        const agdaVersion = options['agda-version'];
        if (opts.isAgdaVersion(agdaVersion)) {
            core.info(`Downloading source distribution for Agda ${agdaVersion} from Hackage`);
            return yield getAgdaSdistFromHackage(agdaVersion);
        }
        else {
            core.info(`Downloading source distribution for Agda ${agdaVersion} from GitHub`);
            return yield getAgdaSdistFromGitHub(agdaVersion);
        }
    });
}
exports.getAgdaSdist = getAgdaSdist;
const agdaGitUrl = 'https://github.com/agda/agda.git';
function getAgdaSdistFromGitHub(agdaVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        if (agdaVersion === 'HEAD') {
            core.info(`Cloning from ${agdaGitUrl}`);
            const sourceDir = opts.cacheDir('agda-HEAD');
            yield exec.getOutput('git', [
                'clone',
                '--single-branch',
                '--depth=1',
                agdaGitUrl,
                sourceDir
            ]);
            yield exec.getOutput('git', ['submodule', 'init'], { cwd: sourceDir });
            yield exec.getOutput('git', ['submodule', 'update', '--depth=1'], {
                cwd: sourceDir
            });
            return sourceDir;
        }
        else {
            throw Error(`getAgdaSdistFromGitHub: unsupported ref '${agdaVersion}'`);
        }
    });
}
function getAgdaSdistFromHackage(agdaVersion) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the package source:
        const { packageVersion, packageDir } = yield hackage.getPackageSource('Agda', {
            packageVersion: agdaVersion,
            fetchPackageInfo: false,
            packageInfoCache: opts.agdaPackageInfoCache
        });
        (0, node_assert_1.default)(agdaVersion === packageVersion, `getAgdaSdist: ${agdaVersion} was resolved to ${packageVersion}`);
        return packageDir;
    });
}
// Executable names
exports.agdaBinName = opts.platform === 'win32' ? 'agda.exe' : 'agda';
exports.agdaModeBinName = opts.platform === 'win32' ? 'agda-mode.exe' : 'agda-mode';
exports.agdaBinNames = [exports.agdaBinName, exports.agdaModeBinName];
function resolveAgdaOptions(agdaOptions, options) {
    var _a, _b, _c, _d;
    const agdaBin = (_a = agdaOptions === null || agdaOptions === void 0 ? void 0 : agdaOptions.agdaBin) !== null && _a !== void 0 ? _a : exports.agdaBinName;
    // Set 'Agda_datadir' if it is explicitly passed:
    const agdaDataDirUnset = ((_b = options === null || options === void 0 ? void 0 : options.env) === null || _b === void 0 ? void 0 : _b.Agda_datadir) === undefined &&
        process.env.Agda_datadir !== undefined;
    if ((agdaOptions === null || agdaOptions === void 0 ? void 0 : agdaOptions.agdaDataDir) !== undefined || agdaDataDirUnset) {
        const agdaDataDirDefault = path.normalize(path.join(path.dirname(path.resolve(agdaBin)), '..', 'data'));
        options = Object.assign(Object.assign({}, options), { env: Object.assign(Object.assign({}, ((_c = options === null || options === void 0 ? void 0 : options.env) !== null && _c !== void 0 ? _c : process.env)), { Agda_datadir: (_d = agdaOptions === null || agdaOptions === void 0 ? void 0 : agdaOptions.agdaDataDir) !== null && _d !== void 0 ? _d : agdaDataDirDefault }) });
    }
    return [agdaBin, options];
}
function agdaGetVersion(agdaOptions, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options);
        const versionOptions = Object.assign(Object.assign({}, optionsWithDataDir), { parseOutput: (progOutput) => {
                if (progOutput.startsWith('Agda version '))
                    return progOutput.substring('Agda version '.length).trim();
                else
                    throw Error(`Could not parse Agda version: '${progOutput}'`);
            } });
        return yield exec.getVersion(agdaBin, versionOptions);
    });
}
exports.agdaGetVersion = agdaGetVersion;
function agdaGetDataDir(agdaOptions, options) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        // Support for --print-agda-dir was added in 2.6.2
        // https://github.com/agda/agda/commit/942c4a86d4941ba14d73ff173bd7d2b26e54da6c
        const agdaVersion = yield agdaGetVersion(agdaOptions, options);
        if (simver.gte(agdaVersion, '2.6.2')) {
            return yield agda(['--print-agda-dir'], agdaOptions, options);
        }
        else {
            const agdaDataDir = (_a = agdaOptions === null || agdaOptions === void 0 ? void 0 : agdaOptions.agdaDataDir) !== null && _a !== void 0 ? _a : (_b = options === null || options === void 0 ? void 0 : options.env) === null || _b === void 0 ? void 0 : _b.Agda_datadir;
            if (agdaDataDir !== undefined)
                return agdaDataDir;
            const agdaBin = (_c = agdaOptions === null || agdaOptions === void 0 ? void 0 : agdaOptions.agdaBin) !== null && _c !== void 0 ? _c : (yield exec.which(exports.agdaBinName));
            return path.join(path.basename(agdaBin), '..', 'data');
        }
    });
}
exports.agdaGetDataDir = agdaGetDataDir;
function agda(args, agdaOptions, options) {
    return __awaiter(this, void 0, void 0, function* () {
        const [agdaBin, optionsWithDataDir] = resolveAgdaOptions(agdaOptions, options);
        return yield exec.getOutput(agdaBin, args, optionsWithDataDir);
    });
}
exports.agda = agda;
function agdaTest(agdaOptions, options) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        const versionString = yield agdaGetVersion(agdaOptions);
        core.info(`Found Agda version ${versionString} on PATH`);
        const dataDir = yield agdaGetDataDir(agdaOptions);
        core.info(`Found Agda data directory at ${dataDir}`);
        const globber = yield glob.create(path.join(dataDir, 'lib', 'prim', '**', '*.agda'), {
            followSymbolicLinks: false,
            implicitDescendants: false,
            matchDirectories: false
        });
        try {
            for (var _b = __asyncValues(globber.globGenerator()), _c; _c = yield _b.next(), !_c.done;) {
                const agdaFile = _c.value;
                core.info(`Compiling ${agdaFile}`);
                yield agda(['-v0', agdaFile], agdaOptions, Object.assign(Object.assign({}, options), { cwd: path.join(dataDir, 'lib', 'prim') }));
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
exports.agdaTest = agdaTest;
function configureEnvFor(installDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const dataDir = path.join(installDir, 'data');
        core.info(`Set Agda_datadir to ${dataDir}`);
        core.exportVariable('Agda_datadir', dataDir);
        core.setOutput('agda-data-path', dataDir);
        const binDir = path.join(installDir, 'bin');
        core.info(`Add ${binDir} to PATH`);
        core.addPath(binDir);
        core.setOutput('agda-path', binDir);
        core.setOutput('agda-exe', path.join(binDir, exports.agdaBinName));
        core.setOutput('agda-mode-exe', path.join(binDir, exports.agdaModeBinName));
    });
}
exports.configureEnvFor = configureEnvFor;
