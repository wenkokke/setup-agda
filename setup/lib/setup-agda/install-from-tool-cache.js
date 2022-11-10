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
const core = __importStar(require("@actions/core"));
const tc = __importStar(require("@actions/tool-cache"));
const path = __importStar(require("node:path"));
const util = __importStar(require("../util"));
// Helper to install from GitHub Runner tool cache
// NOTE: We can hope, can't we?
function installFromToolCache(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // If 'agda-version' is 'HEAD' we must build from source:
        if (options['agda-version'] === 'HEAD')
            return null;
        // If 'agda-version' is 'nightly' we must install from bdist:
        if (options['agda-version'] === 'nightly')
            return null;
        const agdaDirTC = tc.find('agda', options['agda-version']);
        // NOTE: tc.find returns '' if the tool is not found
        if (agdaDirTC === '') {
            core.info(`Could not find cache for Agda ${options['agda-version']}`);
            return null;
        }
        else {
            core.info(`Found cache for Agda ${options['agda-version']}`);
            core.info(`Testing cache for Agda ${options['agda-version']}`);
            try {
                util.agdaTest({
                    agdaBin: path.join(agdaDirTC, 'bin', util.agdaBinName),
                    agdaDataDir: path.join(agdaDirTC, 'data')
                });
                return agdaDirTC;
            }
            catch (error) {
                const warning = util.ensureError(error);
                warning.message = `Rejecting cached Agda ${options['agda-version']}: ${warning.message}`;
                core.warning(warning);
                return null;
            }
        }
    });
}
exports.default = installFromToolCache;
