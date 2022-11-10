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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const node_assert_1 = __importDefault(require("node:assert"));
const simver = __importStar(require("../util/simver"));
const opts = __importStar(require("./types"));
function resolveAgdaVersion(versionSpec) {
    if (versionSpec === 'latest') {
        const latest = simver.max(opts.agdaVersions);
        (0, node_assert_1.default)(latest !== null, [
            `Could not resolve latest Agda version`,
            `from list of known versions ${opts.agdaVersions.join(', ')}`
        ].join(' '));
        (0, node_assert_1.default)(opts.isAgdaVersion(latest), [
            `Resolved latest Agda version to version '${latest}'`,
            `not in list of known versions ${opts.agdaVersions.join(', ')}`
        ].join(' '));
        core.info(`Resolved latest Agda version to ${latest}`);
        core.setOutput('agda-version', latest);
        return latest;
    }
    else {
        core.setOutput('agda-version', versionSpec);
        return versionSpec;
    }
}
exports.default = resolveAgdaVersion;
