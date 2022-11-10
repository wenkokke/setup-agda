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
exports.needsIcu = exports.supportsClusterCounting = exports.supportsOptimiseHeavily = exports.supportsSplitSections = exports.runPreBuildHook = void 0;
const core = __importStar(require("@actions/core"));
const exec = __importStar(require("@actions/exec"));
const os = __importStar(require("node:os"));
const util_1 = require("../util");
const platform_1 = require("./platform");
function runPreBuildHook(options, execOptions) {
    return __awaiter(this, void 0, void 0, function* () {
        if (options['pre-build-hook'] !== '') {
            core.info(`Running pre-build hook:${os.EOL}${options['pre-build-hook']}`);
            execOptions = execOptions !== null && execOptions !== void 0 ? execOptions : {};
            execOptions.input = Buffer.from(options['pre-build-hook'], 'utf-8');
            yield exec.exec('bash', [], execOptions);
        }
    });
}
exports.runPreBuildHook = runPreBuildHook;
function supportsSplitSections(options) {
    // NOTE:
    //   We only set --split-sections on Linux and Windows, as it does nothing on MacOS:
    //   https://github.com/agda/agda/issues/5940
    const platformOK = platform_1.platform === 'linux' || platform_1.platform === 'win32';
    // NOTE:
    //   We only set --split-sections if Ghc >=8.0 and Cabal >=2.2, when the flag was added:
    //   https://cabal.readthedocs.io/en/latest/cabal-project.html#cfg-field-split-sections
    const ghcVersionOK = util_1.simver.gte(options['ghc-version'], '8.0');
    const cabalVersionOK = util_1.simver.gte(options['cabal-version'], '2.2');
    return platformOK && ghcVersionOK && cabalVersionOK;
}
exports.supportsSplitSections = supportsSplitSections;
function supportsOptimiseHeavily(options) {
    // NOTE:
    //   We only enable --optimise-heavily on versions which support it,
    //   i.e., versions after 2.6.2:
    //   https://github.com/agda/agda/blob/1175c41210716074340da4bd4caa09f4dfe2cc1d/doc/release-notes/2.6.2.md
    return (options['agda-version'] === 'HEAD' ||
        util_1.simver.gte(options['agda-version'], '2.6.2'));
}
exports.supportsOptimiseHeavily = supportsOptimiseHeavily;
function supportsClusterCounting(options) {
    // NOTE:
    //   Agda only supports --cluster-counting on versions after 2.5.3:
    //   https://github.com/agda/agda/blob/f50c14d3a4e92ed695783e26dbe11ad1ad7b73f7/doc/release-notes/2.5.3.md
    // NOTE:
    //   Agda versions 2.5.3 - 2.6.2 depend on text-icu ^0.7, but versions
    //   0.7.0.0 - 0.7.1.0 do not compile with icu68+, which can be solved
    //   by passing '--constraint="text-icu >= 0.7.1.0"'
    return (options['agda-version'] === 'HEAD' ||
        util_1.simver.gte(options['agda-version'], '2.5.3'));
}
exports.supportsClusterCounting = supportsClusterCounting;
function needsIcu(options) {
    return (supportsClusterCounting(options) && !options['force-no-cluster-counting']);
}
exports.needsIcu = needsIcu;
