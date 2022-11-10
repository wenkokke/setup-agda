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
const node_os_1 = __importDefault(require("node:os"));
const semver_1 = __importDefault(require("semver"));
const Haskell_versions_json_1 = __importDefault(require("../data/Haskell.versions.json"));
// Resolving the GHC version to use:
function resolveGhcVersion(options, currentVersion, versionsThatCanBuildAgda) {
    (0, node_assert_1.default)(versionsThatCanBuildAgda.length > 0);
    // Print configuration:
    const versionsThatCanBeSetUp = Haskell_versions_json_1.default.ghc;
    core.info([
        'Resolving GHC version:',
        options['ghc-version'] === 'recommended'
            ? `- selecting latest supported GHC version`
            : `- GHC version must be exactly ${options['ghc-version']}`,
        `- GHC version must match ${options['ghc-version-range']}`,
        options['ghc-version-match-exact']
            ? '- GHC version must match exactly'
            : '- GHC version must match in major and minor number',
        currentVersion === null
            ? '- no GHC version is currently installed'
            : `- GHC version ${currentVersion} is currently installed`,
        `- haskell/actions/setup supports GHC versions:`,
        `  ${versionsThatCanBeSetUp.join(', ')}`,
        `- Agda ${options['agda-version']} supportes GHC versions:`,
        `  ${versionsThatCanBuildAgda.join(', ')}`
    ].join(node_os_1.default.EOL));
    // Helpers for finding version matches:
    const match = options['ghc-version-match-exact']
        ? (v1, v2) => semver_1.default.eq(v1, v2)
        : (v1, v2) => semver_1.default.major(v1) === semver_1.default.major(v2) &&
            semver_1.default.minor(v1) === semver_1.default.minor(v2);
    const canBuildAgda = (version) => versionsThatCanBuildAgda.filter(versionThatCanBuildAgda => match(version, versionThatCanBuildAgda));
    const canBeSetUp = (version) => versionsThatCanBeSetUp.filter(versionThatCanBeSetUp => match(version, versionThatCanBeSetUp));
    // If exact version was specified, emit warnings:
    if (options['ghc-version'] !== 'recommended') {
        const matchingVersionsThatCanBuildAgda = canBuildAgda(options['ghc-version']);
        if (!matchingVersionsThatCanBuildAgda)
            core.warning([
                `User-specified GHC ${options['ghc-version']}`,
                `is not supported by Agda ${options['agda-version']}`
            ].join(' '));
        // Check if haskell/actions/setup supports specified version:
        if (!canBeSetUp(options['ghc-version']) &&
            (currentVersion === null ||
                !match(options['ghc-version'], currentVersion)))
            core.warning([
                `User-specified GHC ${options['ghc-version']}`,
                'is not supported by haskell/actions/setup'
            ].join(' '));
        core.info(`Selecting GHC ${options['ghc-version']}: user-specified`);
        return {
            version: options['ghc-version'],
            matchingVersionsThatCanBuildAgda
        };
    }
    // Check if the currently installed version matches:
    if (currentVersion !== null) {
        const matchingVersionsThatCanBuildAgda = canBuildAgda(currentVersion);
        if (matchingVersionsThatCanBuildAgda.length > 0) {
            core.info(`Selecting GHC ${currentVersion}: it is currently installed`);
            return { version: currentVersion, matchingVersionsThatCanBuildAgda };
        }
    }
    // Find which versions are supported:
    core.info('Compiling list of GHC version candidates...');
    const candidates = [];
    if (options['enable-stack'] &&
        options['stack-setup-ghc'] &&
        options['stack-no-global']) {
        // NOTE: We ASSUME stack can setup ANY version of GHC, as I could not find
        //       a published list of supported versions. Therefore, we start from
        //       the list of versions that can build Agda.
        for (const version of versionsThatCanBuildAgda)
            if (!semver_1.default.satisfies(version, options['ghc-version-range']))
                core.info(`Reject GHC ${version}: excluded by user-provided range`);
            else
                candidates.push({
                    version,
                    matchingVersionsThatCanBuildAgda: [version]
                });
    }
    else {
        // NOTE: We start from the list of versions that can be set up, and allow
        //       any version that matches a version that can build Agda.
        // NOTE: This potentially returns a version that does not have a matching
        //       stack-<version>.yaml file, which the stack build code has to
        //       account for.
        for (const version of versionsThatCanBeSetUp) {
            const matchingVersionsThatCanBuildAgda = canBuildAgda(version);
            if (matchingVersionsThatCanBuildAgda.length === 0)
                core.info(`Reject GHC ${version}: unsupported by Agda`);
            else if (!semver_1.default.satisfies(version, options['ghc-version-range']))
                core.info(`Reject GHC ${version}: excluded by user-provided range`);
            else
                candidates.push({
                    version,
                    matchingVersionsThatCanBuildAgda
                });
        }
    }
    if (candidates.length === 0) {
        throw Error('No GHC version candidates');
    }
    else {
        const versions = candidates.map(info => info.version);
        core.info(`GHC version candidates: ${versions.join(', ')}`);
    }
    // Select the latest GHC version from the list of candidates:
    const selected = candidates.reduce((latest, current) => semver_1.default.gte(latest.version, current.version) ? latest : current);
    core.info(`Selecting GHC ${selected.version}: latest supported version`);
    return selected;
}
exports.default = resolveGhcVersion;
