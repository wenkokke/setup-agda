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
exports.agdaVersionToCompatibleAgdaStdlibVersions = exports.agdaStdlibSdistIndex = exports.agdaBdistIndex = exports.agdaPackageInfoCache = exports.isAgdaStdlibVersionSpec = exports.isAgdaStdlibVersion = exports.agdaStdlibVersions = exports.isAgdaVersionSpec = exports.isAgdaGitRef = exports.isDeprecatedAgdaVersion = exports.agdaDeprecatedVersions = exports.isAgdaVersion = exports.agdaVersions = void 0;
const hackage = __importStar(require("../util/hackage"));
const Agda_bdist_json_1 = __importDefault(require("../data/Agda.bdist.json"));
const agda_stdlib_sdist_json_1 = __importDefault(require("../data/agda-stdlib.sdist.json"));
const Agda_versions_deprecated_json_1 = __importDefault(require("../data/Agda.versions.deprecated.json"));
const Agda_versions_normal_json_1 = __importDefault(require("../data/Agda.versions.normal.json"));
const Agda_agda_stdlib_compat_json_1 = __importDefault(require("../data/Agda.agda-stdlib-compat.json"));
const node_assert_1 = __importDefault(require("node:assert"));
exports.agdaVersions = Object.keys(Agda_versions_normal_json_1.default.packageInfo);
// Type guard for Agda versions:
function isAgdaVersion(version) {
    return exports.agdaVersions.includes(version);
}
exports.isAgdaVersion = isAgdaVersion;
exports.agdaDeprecatedVersions = Object.keys(Agda_versions_deprecated_json_1.default.packageInfo);
// Type guard for deprecated Agda versions:
function isDeprecatedAgdaVersion(version) {
    return exports.agdaDeprecatedVersions.includes(version);
}
exports.isDeprecatedAgdaVersion = isDeprecatedAgdaVersion;
// Type guard for Agda git refs:
function isAgdaGitRef(version) {
    return version === 'HEAD';
}
exports.isAgdaGitRef = isAgdaGitRef;
// Type guard for Agda version specifications:
function isAgdaVersionSpec(versionSpec) {
    return (isAgdaVersion(versionSpec) ||
        isAgdaGitRef(versionSpec) ||
        versionSpec === 'latest' ||
        versionSpec === 'nightly');
}
exports.isAgdaVersionSpec = isAgdaVersionSpec;
exports.agdaStdlibVersions = Object.keys(agda_stdlib_sdist_json_1.default);
// Type guard for agda-stdlib versions:
function isAgdaStdlibVersion(version) {
    return exports.agdaStdlibVersions.includes(version);
}
exports.isAgdaStdlibVersion = isAgdaStdlibVersion;
// Type guard for agda-stdlib version specifications:
function isAgdaStdlibVersionSpec(versionSpec) {
    return (isAgdaVersion(versionSpec) ||
        versionSpec === 'recommended' ||
        versionSpec === 'latest' ||
        versionSpec === 'experimental' ||
        versionSpec === 'none');
}
exports.isAgdaStdlibVersionSpec = isAgdaStdlibVersionSpec;
// List of Agda source distributions on Hackage:
exports.agdaPackageInfoCache = hackage.mergePackageInfoCache(Agda_versions_deprecated_json_1.default, Agda_versions_normal_json_1.default);
exports.agdaBdistIndex = Agda_bdist_json_1.default;
// List of agda-stdlib source distributions on GitHub:
//
// NOTE: The type ensures that all source distributions are indexed under valid
//       agda-stdlib version keys.
exports.agdaStdlibSdistIndex = agda_stdlib_sdist_json_1.default;
// The compatibility mapping between Agda versions and agda-stdlib versions:
//
// NOTE: The first type assignment ensures that every Agda version has a
//       list of compatible agda-stdlib version strings, but does not check
//       that those agda-stdlib version strings are valid agda-stdlib versions.
//       The second assignment asserts that they are correct, but does not check it.
const agdaVersionToCompatibleAgdaStdlibVersionStrings = Agda_agda_stdlib_compat_json_1.default;
exports.agdaVersionToCompatibleAgdaStdlibVersions = agdaVersionToCompatibleAgdaStdlibVersionStrings;
for (const agdaVersion of exports.agdaVersions)
    for (const agdaStdlibVersionString of agdaVersionToCompatibleAgdaStdlibVersionStrings[agdaVersion])
        (0, node_assert_1.default)(isAgdaStdlibVersion(agdaStdlibVersionString));
