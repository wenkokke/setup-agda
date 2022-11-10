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
const tc = __importStar(require("@actions/tool-cache"));
const path = __importStar(require("node:path"));
const opts = __importStar(require("./opts"));
const util = __importStar(require("./util"));
function setup(options) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (opts.platform) {
            case 'linux':
                return yield setupLinux(options);
            case 'darwin':
                return yield setupMacOS(options);
            case 'win32':
                return yield setupWindows(options);
        }
    });
}
exports.default = setup;
function setupLinux(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const upxPkgUrl = 'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-amd64_linux.tar.xz';
        const upxTar = yield tc.downloadTool(upxPkgUrl);
        const upxDir = yield tc.extractTar(upxTar, undefined, [
            '--extract',
            '--xz',
            '--preserve-permissions',
            '--strip-components=1'
        ]);
        options['upx-version'] = '3.96';
        return path.join(upxDir, 'upx');
    });
}
function setupMacOS(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Ensure UPX is installed and is the correct version:
        // NOTE: patch version '3.96_1' and (presumably) later versions are OK
        let upxVersion = yield util.brewGetVersion('upx');
        if (upxVersion === undefined)
            yield util.brew('install', 'upx');
        else if (util.simver.lt(upxVersion, '3.96_1'))
            yield util.brew('upgrade', 'upx');
        upxVersion = yield util.brewGetVersion('upx');
        if (upxVersion === undefined)
            throw Error(`Could not install UPX`);
        options['upx-version'] = upxVersion;
        return 'upx';
    });
}
function setupWindows(options) {
    return __awaiter(this, void 0, void 0, function* () {
        const upxPkgUrl = 'https://github.com/upx/upx/releases/download/v3.96/upx-3.96-win64.zip';
        const upxZip = yield tc.downloadTool(upxPkgUrl);
        const upxDir = yield tc.extractZip(upxZip);
        options['upx-version'] = '3.96';
        return path.join(upxDir, 'upx-3.96-win64', 'upx');
    });
}
