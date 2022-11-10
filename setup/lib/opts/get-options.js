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
const yaml = __importStar(require("js-yaml"));
const mustache_1 = __importDefault(require("mustache"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const semver = __importStar(require("semver"));
const ensure_error_1 = __importDefault(require("../util/ensure-error"));
const plat = __importStar(require("./platform"));
const resolve_agda_stdlib_version_1 = __importDefault(require("./resolve-agda-stdlib-version"));
const resolve_agda_version_1 = __importDefault(require("./resolve-agda-version"));
const opts = __importStar(require("./types"));
function getOptions(inputs, actionYml) {
    function getOption(k) {
        var _a, _b;
        const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs === null || inputs === void 0 ? void 0 : inputs[k];
        const inputValue = (_b = (_a = rawInputValue === null || rawInputValue === void 0 ? void 0 : rawInputValue.trim()) !== null && _a !== void 0 ? _a : getDefault(k, actionYml)) !== null && _b !== void 0 ? _b : '';
        core.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`);
        return inputValue;
    }
    function getFlag(k) {
        const rawInputValue = typeof inputs === 'function' ? inputs(k) : inputs === null || inputs === void 0 ? void 0 : inputs[k];
        const inputValue = !(rawInputValue === false ||
            rawInputValue === null ||
            rawInputValue === undefined ||
            rawInputValue === '' ||
            rawInputValue === 'false');
        core.debug(`Input ${k}: ${rawInputValue} => ${inputValue}`);
        return inputValue;
    }
    function getFlagPair(flagOn, flagOff) {
        const [on, off] = [getFlag(flagOn), getFlag(flagOff)];
        if (on && off)
            throw Error(`Flags ${flagOn} and ${flagOff} conflict.`);
        return [on, off];
    }
    // Resolve Agda version:
    const agdaVersionSpec = getOption('agda-version');
    if (!opts.isAgdaVersionSpec(agdaVersionSpec))
        if (opts.isDeprecatedAgdaVersion(agdaVersionSpec))
            throw Error(`Agda version ${agdaVersionSpec} is deprecated`);
        else
            throw Error(`Could not parse Agda version ${agdaVersionSpec}`);
    const agdaVersion = (0, resolve_agda_version_1.default)(agdaVersionSpec);
    // Resolve agda-stdlib version:
    const agdaStdlibVersionSpec = getOption('agda-stdlib-version');
    if (!opts.isAgdaStdlibVersionSpec(agdaStdlibVersionSpec))
        throw Error(`Unsupported value for input 'agda-stdlib-version': '${agdaStdlibVersionSpec}'`);
    const agdaStdlibVersion = (0, resolve_agda_stdlib_version_1.default)(agdaVersion, agdaStdlibVersionSpec);
    // Validate ghc-version-range:
    const ghcVersionRange = getOption('ghc-version-range');
    if (!semver.validRange(ghcVersionRange))
        throw Error('Input "ghc-version-range" is not a valid version range');
    // Check for contradictory options:
    const [forceBuild, forceNoBuild] = getFlagPair('force-build', 'force-no-build');
    const [forceClusterCounting, forceNoClusterCounting] = getFlagPair('force-cluster-counting', 'force-no-cluster-counting');
    const [forceOptimiseHeavily, forceNoOptimiseHeavily] = getFlagPair('force-optimise-heavily', 'force-no-optimise-heavily');
    // Parse the bdist name:
    const bdistName = parseBdistName(getOption('bdist-name'));
    const bdistRetentionDays = getOption('bdist-retention-days');
    const bdistRetentionDaysInt = parseInt(bdistRetentionDays);
    if (!(0 <= bdistRetentionDaysInt && bdistRetentionDaysInt <= 90))
        throw Error([
            `Input "bdist-rentention-days" must be a number between 0 and 90.`,
            `Found "${bdistRetentionDays}".`
        ].join(' '));
    // Create build options:
    const options = {
        // Specified in Agdaopts.SetupInputs
        'agda-version': agdaVersion,
        'agda-stdlib-version': agdaStdlibVersion,
        'agda-stdlib-default': getFlag('agda-stdlib-default'),
        'bdist-compress-exe': getFlag('bdist-compress-exe'),
        'bdist-name': bdistName,
        'bdist-retention-days': bdistRetentionDays,
        'bdist-upload': getFlag('bdist-upload'),
        'force-build': forceBuild,
        'force-no-build': forceNoBuild,
        'force-cluster-counting': forceClusterCounting,
        'force-no-cluster-counting': forceNoClusterCounting,
        'force-optimise-heavily': forceOptimiseHeavily,
        'force-no-optimise-heavily': forceNoOptimiseHeavily,
        'ghc-version-match-exact': getFlag('ghc-version-match-exact'),
        'ghc-version-range': ghcVersionRange,
        'pre-build-hook': getOption('pre-build-hook'),
        // Specified in Haskellopts.SetupInputs
        'cabal-version': getOption('cabal-version'),
        'disable-matcher': getFlag('disable-matcher'),
        'enable-stack': getFlag('enable-stack'),
        'ghc-version': getOption('ghc-version'),
        'stack-no-global': getFlag('stack-no-global'),
        'stack-setup-ghc': getFlag('stack-setup-ghc'),
        'stack-version': getOption('stack-version'),
        // Specified in opts.BuildOptions
        'extra-include-dirs': [],
        'extra-lib-dirs': []
    };
    // Print options:
    core.info([
        'Options:',
        ...Object.entries(Object.assign({ os: plat.platform }, options)).map(entry => {
            const [key, value] = entry;
            if (Array.isArray(value))
                return `- ${key}: [${value.join(', ')}]`;
            else
                return `- ${key}: ${value}`;
        })
    ].join(os.EOL));
    return options;
}
exports.default = getOptions;
let inputSpec = undefined;
function getDefault(k, actionYml) {
    if (inputSpec === undefined) {
        actionYml = actionYml !== null && actionYml !== void 0 ? actionYml : path.join(__dirname, '..', 'action.yml');
        inputSpec = yaml.load(fs.readFileSync(actionYml, 'utf8')).inputs;
    }
    return inputSpec[k].default;
}
function parseBdistName(bdistName) {
    try {
        // Join various parts of 'bdist-name', if it was defined over multiple lines.
        bdistName = bdistName.split(/\s+/g).join('').trim();
        // Attempt to parse it, to ensure errors are raised early. Caches the result.
        mustache_1.default.parse(bdistName);
        return bdistName;
    }
    catch (error) {
        throw Error([
            `Could not parse input 'bdist-name': '${bdistName}':`,
            (0, ensure_error_1.default)(error).message
        ].join(os.EOL));
    }
}
