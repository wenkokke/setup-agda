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
exports.supportedGhcVersions = exports.build = exports.name = void 0;
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const fs = __importStar(require("node:fs"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const semver = __importStar(require("semver"));
const opts = __importStar(require("../../opts"));
const util = __importStar(require("../../util"));
exports.name = 'cabal';
function build(sourceDir, installDir, options, 
// eslint-disable-next-line @typescript-eslint/no-unused-vars
matchingGhcVersionsThatCanBuildAgda) {
    return __awaiter(this, void 0, void 0, function* () {
        const execOptions = { cwd: sourceDir };
        // Run `cabal update`
        yield util.cabal(['v2-update']);
        // Run `cabal configure`:
        core.info(`Configure Agda-${options['agda-version']}`);
        yield util.cabal(['v2-configure', ...buildFlags(options)], execOptions);
        // Run the pre-build hook:
        yield opts.runPreBuildHook(options, execOptions);
        // Run `cabal build`:
        core.info(`Build Agda-${options['agda-version']}`);
        yield util.cabal(['v2-build', 'exe:agda', 'exe:agda-mode'], execOptions);
        // Run `cabal install`:
        core.info(`Install Agda-${options['agda-version']} to ${installDir}`);
        yield util.mkdirP(path.join(installDir, 'bin'));
        yield util.cabal([
            'v2-install',
            'exe:agda',
            'exe:agda-mode',
            '--install-method=copy',
            `--installdir=${path.join(installDir, 'bin')}`
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
    flags.push('--disable-executable-profiling');
    flags.push('--disable-library-profiling');
    // If supported, pass Agda flag --cluster-counting
    if (!options['force-no-cluster-counting'] &&
        opts.supportsClusterCounting(options)) {
        flags.push('--flags=+enable-cluster-counting');
    }
    // If supported, pass Agda flag --optimise-heavily
    if (!options['force-no-optimise-heavily'] &&
        opts.supportsOptimiseHeavily(options)) {
        flags.push('--flags=+optimise-heavily');
    }
    // If supported, set --split-sections.
    if (opts.supportsSplitSections(options)) {
        flags.push('--enable-split-sections');
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
        const cabalFilePath = yield findCabalFile(sourceDir);
        const cabalFileContents = fs.readFileSync(cabalFilePath).toString();
        for (const match of cabalFileContents.matchAll(/GHC == (?<version>\d+\.\d+\.\d+)/g)) {
            if (match.groups !== undefined) {
                if (semver.valid(match.groups.version) !== null) {
                    versions.push(match.groups.version);
                }
                else {
                    core.warning(`Could not parse GHC version '${match.groups.version}' in: ${cabalFilePath}`);
                }
            }
        }
        if (versions.length === 0) {
            throw Error([
                `Could not determine supported GHC versions for building with Cabal:`,
                `${path.basename(cabalFilePath)} does not sepecify 'tested-with'.`
            ].join(os.EOL));
        }
        else {
            return versions;
        }
    });
}
exports.supportedGhcVersions = supportedGhcVersions;
function findCabalFile(sourceDir) {
    return __awaiter(this, void 0, void 0, function* () {
        const cabalFileGlobber = yield glob.create(path.join(sourceDir, '*.cabal'), {
            followSymbolicLinks: false,
            implicitDescendants: false,
            matchDirectories: false
        });
        const cabalFilePaths = yield cabalFileGlobber.glob();
        if (cabalFilePaths.length !== 1) {
            throw Error([
                `Found multiple .cabal files:`,
                ...cabalFilePaths.map(cabalFilePath => `- ${cabalFilePath}`)
            ].join(os.EOL));
        }
        else {
            return cabalFilePaths[0];
        }
    });
}
