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
exports.bundleForWindows = exports.setupForWindows = void 0;
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const util = __importStar(require("../util"));
// Windows
function setupForWindows(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Install pkg-config & ICU:
        core.addPath('C:\\msys64\\mingw64\\bin');
        core.addPath('C:\\msys64\\usr\\bin');
        yield util.pacman('-v', '--noconfirm', '-Sy', 'mingw-w64-x86_64-pkg-config', 'mingw-w64-x86_64-icu');
        // Find the ICU version:
        options['icu-version'] = yield util.pkgConfig('--modversion', 'icu-i18n');
        // Add extra-{include,lib}-dirs:
        options['extra-include-dirs'].push(core.toPlatformPath(yield util.pkgConfig('--variable', 'includedir', 'icu-i18n')));
        // NOTE:
        //   The libdir (C:\msys64\mingw64\lib) only contains libicu*.dll.a,
        //   not libicu*.dll. I'm not sure what the .dll.a files are?
        for (const libDir of yield icuGetLibDirs())
            options['extra-lib-dirs'].push(libDir);
        // Print ICU package info:
        try {
            core.info(JSON.stringify(yield util.pkgConfigGetInfo('icu-io')));
        }
        catch (error) {
            core.info(util.ensureError(error).message);
        }
    });
}
exports.setupForWindows = setupForWindows;
function bundleForWindows(distDir, options) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options['icu-version'] === undefined)
            throw Error('No ICU version');
        core.info(`Bundle ICU version ${options['icu-version']}`);
        const libVerMaj = util.simver.major(options['icu-version']);
        const libDirsFrom = yield icuGetLibDirs();
        const libFromPatterns = [...libDirsFrom]
            .flatMap(libDir => ['libicuin', 'libicuuc', 'libicudt', 'libicuio'].flatMap(libName => path.join(libDir, `${libName}${libVerMaj}.dll`)))
            .join(os.EOL);
        core.info(`Searching with:${os.EOL}${libFromPatterns}`);
        const libFromGlobber = yield glob.create(libFromPatterns);
        const libsFrom = yield libFromGlobber.glob();
        core.info(`Found libraries:${os.EOL}${libsFrom.join(os.EOL)}`);
        // Copy library files
        const libDirTo = path.join(distDir, 'bin');
        core.info(`Copy ICU ${options['icu-version']} in ${libDirTo}`);
        yield util.mkdirP(libDirTo);
        for (const libFrom of libsFrom) {
            const libName = path.basename(libFrom);
            const libTo = path.join(libDirTo, libName);
            // Copy the library:
            yield util.cp(libFrom, libTo);
        }
    });
}
exports.bundleForWindows = bundleForWindows;
function icuGetLibDirs() {
    return __awaiter(this, void 0, void 0, function* () {
        const icuInLibDir = yield util.pkgConfig('--variable', 'libdir', 'icu-i18n');
        const icuUcLibDir = yield util.pkgConfig('--variable', 'libdir', 'icu-uc');
        const icuIoLibDir = yield util.pkgConfig('--variable', 'libdir', 'icu-io');
        return new Set([
            'C:\\msys64\\mingw64\\bin',
            'C:\\msys64\\usr\\bin',
            core.toPlatformPath(icuInLibDir),
            core.toPlatformPath(icuUcLibDir),
            core.toPlatformPath(icuIoLibDir)
        ]);
    });
}
