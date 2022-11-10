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
exports.bundle = exports.setup = void 0;
const opts = __importStar(require("./opts"));
const linux_1 = require("./setup-icu/linux");
const macos_1 = require("./setup-icu/macos");
const windows_1 = require("./setup-icu/windows");
function setup(options) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (opts.platform) {
            case 'linux':
                return yield (0, linux_1.setupForLinux)(options);
            case 'darwin':
                return yield (0, macos_1.setupForMacOS)(options);
            case 'win32':
                return yield (0, windows_1.setupForWindows)(options);
        }
    });
}
exports.setup = setup;
// NOTE: This module hardcodes a number of assumptions about libicu which may
//       not always be true, e.g., library name starts with 'libicu', binaries
//       are linked against the major version on Linux and Windows but against
//       the entire version on MacOS, the internal dependencies of ICU, etc.
// NOTE: This module could be rewritten to be much closer to 'repairwheel' by
//       maintaining a list of allowed libraries (like 'manylinux') and using
//       `dumpbin`, `patchelf` and `otool` to find and bundle *all* libraries
//       that aren't on that list.
function bundle(distDir, options) {
    return __awaiter(this, void 0, void 0, function* () {
        switch (opts.platform) {
            case 'linux':
                return yield (0, linux_1.bundleForLinux)(distDir, options);
            case 'darwin':
                return yield (0, macos_1.bundleForMacOS)(distDir, options);
            case 'win32':
                return yield (0, windows_1.bundleForWindows)(distDir, options);
        }
    });
}
exports.bundle = bundle;
