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
exports.bundleForMacOS = exports.setupForMacOS = void 0;
const core = __importStar(require("@actions/core"));
const path = __importStar(require("node:path"));
const util = __importStar(require("../util"));
const node_assert_1 = __importDefault(require("node:assert"));
// MacOS
function installDirForMacOS() {
    return __awaiter(this, void 0, void 0, function* () {
        return yield util.brew('--prefix', 'icu4c');
    });
}
function setupForMacOS(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure ICU is installed:
        let icuVersion = yield util.brewGetVersion('icu4c');
        core.info(`Found ICU version: ${icuVersion}`);
        if (icuVersion === undefined) {
            yield util.brew('install', 'icu4c');
            icuVersion = yield util.brewGetVersion('icu4c');
            core.info(`Installed ICU version: ${icuVersion}`);
        }
        if (icuVersion === undefined)
            throw Error('Could not install icu4c');
        // Find the ICU installation location:
        const prefix = yield installDirForMacOS();
        core.info(`Found ICU version ${icuVersion} at ${prefix}`);
        // Add to PKG_CONFIG_PATH:
        const pkgConfigDir = path.join(prefix, 'lib', 'pkgconfig');
        util.addPkgConfigPath(pkgConfigDir);
        // Find the ICU version:
        options['icu-version'] = yield util.pkgConfig('--modversion', 'icu-i18n');
        (0, node_assert_1.default)(icuVersion === options['icu-version'], 'ICU version reported by Homebrew differs from ICU version reported by pkg-config');
        // Add extra-{include,lib}-dirs:
        options['extra-include-dirs'].push(core.toPlatformPath(yield util.pkgConfig('--variable', 'includedir', 'icu-i18n')));
        options['extra-lib-dirs'].push(core.toPlatformPath(yield util.pkgConfig('--variable', 'libdir', 'icu-i18n')));
        // Print ICU package info:
        try {
            core.info(JSON.stringify(yield util.pkgConfigGetInfo('icu-i18n')));
        }
        catch (error) {
            core.info(util.ensureError(error).message);
        }
    });
}
exports.setupForMacOS = setupForMacOS;
function bundleForMacOS(distDir, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options['icu-version'] === undefined)
            throw Error('No ICU version');
        // Gather information
        core.info(`Bundle ICU version ${options['icu-version']}`);
        const prefix = yield installDirForMacOS();
        core.info(`Found ICU version ${options['icu-version']} at ${prefix}`);
        const distLibDir = path.join(distDir, 'lib');
        const distBinDir = path.join(distDir, 'bin');
        // Copy library files & change their IDs
        core.info(`Copy ICU ${options['icu-version']} in ${distLibDir}`);
        yield util.mkdirP(distLibDir);
        for (const libName of ['libicui18n', 'libicuuc', 'libicudata']) {
            const libNameFrom = `${libName}.${options['icu-version']}.dylib`;
            const libFrom = path.join(prefix, 'lib', libNameFrom);
            const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`;
            const libTo = path.join(distLibDir, libNameTo);
            // Copy the library:
            yield util.cp(libFrom, libTo);
            // Change the library ID:
            yield util.installNameTool('-id', libNameTo, libTo);
        }
        // Change internal dependencies between libraries:
        const icuVerMaj = util.simver.major(options['icu-version']);
        const libDepsToChange = [
            ['libicui18n', ['libicudata', 'libicuuc']],
            ['libicuuc', ['libicudata']]
        ];
        for (const [libName, depNames] of libDepsToChange) {
            const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`;
            const libTo = path.join(distLibDir, libNameTo);
            for (const depName of depNames) {
                const depFrom = `@loader_path/${depName}.${icuVerMaj}.dylib`;
                const depTo = `@loader_path/agda-${options['agda-version']}-${depName}.dylib`;
                yield util.installNameTool('-change', depFrom, depTo, libTo);
            }
        }
        // Change dependencies on Agda executable:
        const agdaBinPath = path.join(distBinDir, util.agdaBinName);
        const binDepsToChange = ['libicui18n', 'libicuuc'];
        for (const libName of binDepsToChange) {
            const libNameFrom = `${libName}.${options['icu-version']}.dylib`;
            const libFrom = path.join(prefix, 'lib', libNameFrom);
            const libNameTo = `agda-${options['agda-version']}-${libName}.dylib`;
            const libTo = `@executable_path/../lib/${libNameTo}`;
            yield util.installNameTool('-change', libFrom, libTo, agdaBinPath);
        }
    });
}
exports.bundleForMacOS = bundleForMacOS;
