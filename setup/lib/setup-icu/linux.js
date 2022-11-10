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
exports.bundleForLinux = exports.setupForLinux = void 0;
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const util = __importStar(require("../util"));
function setupForLinux(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Find the ICU version:
        options['icu-version'] = yield util.pkgConfig('--modversion', 'icu-i18n');
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
exports.setupForLinux = setupForLinux;
function bundleForLinux(distDir, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options['icu-version'] === undefined)
            throw Error('No ICU version');
        // Gather information
        core.info(`Bundle ICU version ${options['icu-version']}`);
        const libDirsFrom = new Set();
        libDirsFrom.add(yield util.pkgConfig('--variable', 'libdir', 'icu-i18n'));
        libDirsFrom.add(yield util.pkgConfig('--variable', 'libdir', 'icu-uc'));
        const libFromPatterns = [...libDirsFrom]
            .flatMap(libDir => ['libicui18n', 'libicuuc', 'libicudata'].flatMap(libName => path.join(libDir, `${libName}.so.${options['icu-version']}`)))
            .join(os.EOL);
        core.info(`Searching with:${os.EOL}${libFromPatterns}`);
        const libFromGlobber = yield glob.create(libFromPatterns);
        const libsFrom = yield libFromGlobber.glob();
        core.info(`Found libraries:${os.EOL}${libsFrom.join(os.EOL)}`);
        // core.info(`Found ICU version ${options['icu-version']} at ${prefix}`)
        const distLibDir = path.join(distDir, 'lib');
        const distBinDir = path.join(distDir, 'bin');
        // Copy library files & change their IDs
        core.info(`Copy ICU ${options['icu-version']} in ${distLibDir}`);
        yield util.mkdirP(distLibDir);
        for (const libFrom of libsFrom) {
            const libName = path.basename(libFrom, `.so.${options['icu-version']}`);
            const libNameTo = `agda-${options['agda-version']}-${libName}.so`;
            const libTo = path.join(distLibDir, libNameTo);
            // Copy the library:
            yield util.cp(libFrom, libTo);
            // Change the library ID:
            yield util.patchelf('--set-soname', libNameTo, libTo);
        }
        // Change internal dependencies between libraries:
        const icuVerMaj = util.simver.major(options['icu-version']);
        const libDepsToChange = [
            ['libicui18n', ['libicuuc']],
            ['libicuuc', ['libicudata']]
        ];
        for (const [libName, depNames] of libDepsToChange) {
            const libNameTo = `agda-${options['agda-version']}-${libName}.so`;
            const libTo = path.join(distLibDir, libNameTo);
            for (const depName of depNames) {
                const depFrom = `${depName}.so.${icuVerMaj}`;
                const depTo = `agda-${options['agda-version']}-${depName}.so`;
                yield util.patchelf('--replace-needed', depFrom, depTo, libTo);
            }
            // NOTE: This overrides any previously set run path.
            yield util.patchelf('--set-rpath', '$ORIGIN', libTo);
        }
        // Change dependencies on Agda executable:
        const agdaBinPath = path.join(distBinDir, util.agdaBinName);
        const binDepsToChange = ['libicui18n', 'libicuuc', 'libicudata'];
        for (const depName of binDepsToChange) {
            const depNameFrom = `${depName}.so.${icuVerMaj}`;
            const depNameTo = `agda-${options['agda-version']}-${depName}.so`;
            yield util.patchelf('--replace-needed', depNameFrom, depNameTo, agdaBinPath);
        }
        // NOTE: This overrides any previously set run path.
        yield util.patchelf('--set-rpath', '$ORIGIN/../lib', agdaBinPath);
    });
}
exports.bundleForLinux = bundleForLinux;
