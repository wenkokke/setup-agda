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
exports.supportedGhcVersions = exports.build = exports.name = void 0;
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const path = __importStar(require("node:path"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const semver = __importStar(require("semver"));
const opts = __importStar(require("../../opts"));
const util = __importStar(require("../../util"));
const node_assert_1 = __importDefault(require("node:assert"));
exports.name = 'stack';
function build(sourceDir, installDir, options, matchingGhcVersionsThatCanBuildAgda) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create the stack.yaml file:
        const stackYaml = yield findStackYaml(sourceDir, options, matchingGhcVersionsThatCanBuildAgda);
        const execOptions = {
            cwd: sourceDir,
            env: Object.assign(Object.assign({}, process.env), { STACK_YAML: stackYaml })
        };
        // Set whether or not to use a system GHC:
        if (options['stack-setup-ghc']) {
            yield util.stack(['config', 'set', 'system-ghc', 'false'], execOptions);
            yield util.stack(['config', 'set', 'install-ghc', 'true'], execOptions);
        }
        else {
            yield util.stack(['config', 'set', 'system-ghc', 'true'], execOptions);
            yield util.stack(['config', 'set', 'install-ghc', 'false'], execOptions);
        }
        // Run the pre-build hook:
        yield opts.runPreBuildHook(options, execOptions);
        // Configure, Build, and Install:
        const installBinDir = path.join(installDir, 'bin');
        yield util.mkdirP(installBinDir);
        yield util.stack([
            'build',
            ...buildFlags(options),
            '--copy-bins',
            `--local-bin-path=${installBinDir}`
        ], execOptions);
    });
}
exports.build = build;
function buildFlags(options) {
    // NOTE:
    //   We set the build flags following Agda's deploy workflow, which builds
    //   the nightly distributions, except that we disable --cluster-counting
    //   for all builds. See:
    //   https://github.com/agda/agda/blob/d5b5d90a3e34cf8cbae838bc20e94b74a20fea9c/src/github/workflows/deploy.yml#L37-L47
    const flags = [];
    // Disable profiling:
    flags.push('--no-executable-profiling');
    flags.push('--no-library-profiling');
    // If supported, pass Agda flag --cluster-counting
    if (!options['force-no-cluster-counting'] &&
        opts.supportsClusterCounting(options)) {
        flags.push('--flag=Agda:enable-cluster-counting');
    }
    // If supported, pass Agda flag --optimise-heavily
    if (!options['force-no-optimise-heavily'] &&
        opts.supportsOptimiseHeavily(options)) {
        flags.push('--flag=Agda:optimise-heavily');
    }
    // Add extra-{include,lib}-dirs:
    for (const includeDir of options['extra-include-dirs']) {
        flags.push(`--extra-include-dirs=${includeDir}`);
    }
    for (const libDir of options['extra-lib-dirs']) {
        flags.push(`--extra-lib-dirs=${libDir}`);
    }
    return flags;
}
function supportedGhcVersions(sourceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const versions = [];
        const stackYamlGlobber = yield glob.create(path.join(sourceDir, 'stack-*.yaml'));
        const stackYamlPaths = yield stackYamlGlobber.glob();
        for (const stackYamlPath of stackYamlPaths) {
            const version = path
                .basename(stackYamlPath, '.yaml')
                .substring('stack-'.length);
            if (semver.valid(version) !== null) {
                versions.push(version);
            }
            else {
                core.warning(`Could not parse GHC version '${version}' from ${stackYamlPath}`);
            }
        }
        if (versions.length === 0) {
            throw Error([
                `Could not determine supported GHC versions for building with Stack:`,
                `No files matching 'stack-*.yaml' in ${sourceDir}:`,
                yield util.lsR(sourceDir)
            ].join(os.EOL));
        }
        else {
            return versions;
        }
    });
}
exports.supportedGhcVersions = supportedGhcVersions;
function findStackYaml(sourceDir, options, matchingGhcVersionsThatCanBuildAgda) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, node_assert_1.default)(matchingGhcVersionsThatCanBuildAgda.length > 0);
        let ghcVersionWithStackYaml = null;
        if (ghcVersionMatchExact(options, matchingGhcVersionsThatCanBuildAgda)) {
            ghcVersionWithStackYaml = options['ghc-version'];
        }
        else {
            ghcVersionWithStackYaml = semver.maxSatisfying(matchingGhcVersionsThatCanBuildAgda, '*');
            (0, node_assert_1.default)(ghcVersionWithStackYaml !== null);
        }
        const stackYamlName = `stack-${ghcVersionWithStackYaml}.yaml`;
        core.info(`stack: Using ${stackYamlName}`);
        (0, node_assert_1.default)(fs.existsSync(path.join(sourceDir, stackYamlName)));
        return stackYamlName;
    });
}
function ghcVersionMatchExact(options, matchingGhcVersionsThatCanBuildAgda) {
    return matchingGhcVersionsThatCanBuildAgda.includes(options['ghc-version']);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function findAgdaBins(sourceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        if (opts.platform === 'win32') {
            // Find agda.exe:
            const agdaBinGlobber = yield glob.create(path.join(sourceDir, '.stack-work\\dist\\*\\Cabal-*\\build\\Agda\\agda.exe'), { matchDirectories: false });
            const agdaBinPaths = yield agdaBinGlobber.glob();
            if (agdaBinPaths.length === 0)
                throw Error(`Could not find Agda binary`);
            else if (agdaBinPaths.length > 1)
                core.warning(`Found multiple Agda binaries:${os.EOL}${agdaBinPaths
                    .map(p => `- ${p}`)
                    .join(os.EOL)}`);
            // Find agda-mode.exe:
            const agdaModeBinGlobber = yield glob.create(path.join(sourceDir, '.stack-work\\dist\\*\\Cabal-*\\build\\agda-mode\\agda-mode.exe'), { matchDirectories: false });
            const agdaModeBinPaths = yield agdaModeBinGlobber.glob();
            if (agdaModeBinPaths.length === 0)
                throw Error(`Could not find Agda binary`);
            else if (agdaModeBinPaths.length > 1)
                core.warning(`Found multiple Agda binaries:${os.EOL}${agdaModeBinPaths
                    .map(p => `- ${p}`)
                    .join(os.EOL)}`);
            const [agdaBinPath] = agdaBinPaths;
            const [agdaModeBinPath] = agdaModeBinPaths;
            return { agdaBinPath, agdaModeBinPath };
        }
        else {
            // Find agda:
            const agdaBinGlobber = yield glob.create(path.join(sourceDir, '.stack-work/dist/*/Cabal-*/build/Agda/agda'), { matchDirectories: false });
            const agdaBinPaths = yield agdaBinGlobber.glob();
            if (agdaBinPaths.length === 0)
                throw Error(`Could not find Agda binary`);
            else if (agdaBinPaths.length > 1)
                core.warning(`Found multiple Agda binaries:${os.EOL}${agdaBinPaths
                    .map(p => `- ${p}`)
                    .join(os.EOL)}`);
            // Find agda-mode:
            const agdaModeBinGlobber = yield glob.create(path.join(sourceDir, '.stack-work/dist/*/Cabal-*/build/agda-mode/agda-mode'), { matchDirectories: false });
            const agdaModeBinPaths = yield agdaModeBinGlobber.glob();
            if (agdaModeBinPaths.length === 0)
                throw Error(`Could not find Agda binary`);
            else if (agdaModeBinPaths.length > 1)
                core.warning(`Found multiple Agda binaries:${os.EOL}${agdaModeBinPaths
                    .map(p => `- ${p}`)
                    .join(os.EOL)}`);
            const [agdaBinPath] = agdaBinPaths;
            const [agdaModeBinPath] = agdaModeBinPaths;
            return { agdaBinPath, agdaModeBinPath };
        }
    });
}
