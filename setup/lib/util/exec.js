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
exports.getVersion = exports.lsR = exports.rmRF = exports.mkdirP = exports.mv = exports.cpR = exports.cp = exports.getOutput = exports.which = exports.findInPath = void 0;
const exec = __importStar(require("@actions/exec"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const core = __importStar(require("@actions/core"));
const io = __importStar(require("@actions/io"));
const opts = __importStar(require("../opts"));
const ensure_error_1 = __importDefault(require("./ensure-error"));
var io_1 = require("@actions/io");
Object.defineProperty(exports, "findInPath", { enumerable: true, get: function () { return io_1.findInPath; } });
Object.defineProperty(exports, "which", { enumerable: true, get: function () { return io_1.which; } });
function getOutput(prog, args, execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        let progOutput = '';
        let progErrors = '';
        execOptions = execOptions !== null && execOptions !== void 0 ? execOptions : {};
        execOptions.ignoreReturnCode = true;
        execOptions.listeners = {
            stdout: (data) => {
                progOutput += data.toString();
            },
            stderr: (data) => {
                progErrors += data.toString();
            }
        };
        const exitCode = yield exec.exec(prog, args, execOptions);
        if (exitCode === 0) {
            return progOutput.trim();
        }
        else {
            throw Error(`The call to ${prog} failed with exit code ${exitCode}:${os.EOL}${progErrors}`);
        }
    });
}
exports.getOutput = getOutput;
function cp(source, dest, options) {
    return __awaiter(this, void 0, void 0, function* () {
        source = escape(source);
        dest = escape(dest);
        core.info(`cp ${source} ${dest}`);
        try {
            return yield io.cp(source, dest, options);
        }
        catch (error) {
            const theError = (0, ensure_error_1.default)(error);
            theError.message = [
                theError.message,
                `- sourceDir: ${yield lsR(path.dirname(source))}`,
                `- destDir: ${yield lsR(path.dirname(dest))}`,
                `- options: ${JSON.stringify(options)}`
            ].join(os.EOL);
            throw theError;
        }
    });
}
exports.cp = cp;
function cpR(source, dest, options) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield cp(source, dest, Object.assign(Object.assign({}, options), { recursive: true }));
    });
}
exports.cpR = cpR;
function mv(source, dest, options) {
    return __awaiter(this, void 0, void 0, function* () {
        source = escape(source);
        dest = escape(dest);
        core.info(`mv ${source} ${dest}`);
        return yield io.mv(source, dest, options);
    });
}
exports.mv = mv;
function mkdirP(dir) {
    return __awaiter(this, void 0, void 0, function* () {
        dir = escape(dir);
        core.info(`mkdir -p ${dir}`);
        return yield io.mkdirP(dir);
    });
}
exports.mkdirP = mkdirP;
function rmRF(inputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        inputPath = escape(inputPath);
        core.info(`rm -rf ${inputPath}`);
        return yield io.rmRF(inputPath);
    });
}
exports.rmRF = rmRF;
function lsR(inputPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            inputPath = escape(inputPath);
            core.info(`ls -R ${inputPath}`);
            return yield getOutput('ls', ['-R', inputPath]);
        }
        catch (error) {
            return (0, ensure_error_1.default)(error).message;
        }
    });
}
exports.lsR = lsR;
function escape(filePath) {
    switch (opts.platform) {
        case 'darwin':
        case 'linux':
            return filePath.replace(/(?<!\\) /g, '\\ ');
        case 'win32':
        default:
            return filePath;
    }
}
function getVersion(prog, options) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const versionFlag = (_a = options === null || options === void 0 ? void 0 : options.versionFlag) !== null && _a !== void 0 ? _a : '--version';
        let progOutput = yield getOutput(prog, [versionFlag], options);
        progOutput = progOutput.trim();
        return (options === null || options === void 0 ? void 0 : options.parseOutput) !== undefined
            ? options === null || options === void 0 ? void 0 : options.parseOutput(progOutput)
            : progOutput;
    });
}
exports.getVersion = getVersion;
