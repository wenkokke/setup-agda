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
exports.dumpbin = exports.installNameTool = exports.otool = exports.patchelf = exports.printNeeded = void 0;
const core = __importStar(require("@actions/core"));
const os = __importStar(require("node:os"));
const opts = __importStar(require("../opts"));
const ensure_error_1 = __importDefault(require("./ensure-error"));
const exec = __importStar(require("./exec"));
function printNeeded(binPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let output = '';
            switch (opts.platform) {
                case 'linux': {
                    output = yield patchelf('--print-needed', binPath);
                    break;
                }
                case 'darwin': {
                    output = yield otool('-L', binPath);
                    break;
                }
                case 'win32': {
                    output = yield dumpbin('/imports', binPath);
                    break;
                }
            }
            core.info(`Needed libraries:${os.EOL}${output}`);
        }
        catch (error) {
            core.info((0, ensure_error_1.default)(error).message);
        }
    });
}
exports.printNeeded = printNeeded;
function patchelf(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('patchelf', args);
    });
}
exports.patchelf = patchelf;
function otool(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('otool', args);
    });
}
exports.otool = otool;
function installNameTool(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('install_name_tool', args);
    });
}
exports.installNameTool = installNameTool;
function dumpbin(...args) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield exec.getOutput('dumpbin', args);
    });
}
exports.dumpbin = dumpbin;
