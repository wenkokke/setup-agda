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
const core = __importStar(require("@actions/core"));
const path = __importStar(require("node:path"));
const opts = __importStar(require("../opts"));
const setup_haskell_1 = __importDefault(require("../setup-haskell"));
const icu = __importStar(require("../setup-icu"));
const util = __importStar(require("../util"));
const cabal = __importStar(require("./build-from-sdist/cabal"));
const stack = __importStar(require("./build-from-sdist/stack"));
const upload_bdist_1 = __importDefault(require("./upload-bdist"));
function buildFromSource(options) {
    return __awaiter(this, void 0, void 0, function* () {
        // If 'agda-version' is 'nightly' we must install from bdist:
        if (options['agda-version'] === 'nightly')
            return null;
        const buildInfo = yield core.group('🛠 Preparing to build Agda from source', () => __awaiter(this, void 0, void 0, function* () {
            // Download the source:
            core.info('Download source distribution');
            const sourceDir = yield util.getAgdaSdist(options);
            core.info(`Downloaded source distribution to ${sourceDir}`);
            // Determine the build tool:
            const buildTool = options['enable-stack'] ? stack : cabal;
            core.info(`Set build tool to ${buildTool.name}`);
            // Determine the GHC version:
            const currentGhcVersion = yield util.ghcMaybeGetVersion();
            const currentCabalVersion = yield util.cabalMaybeGetVersion();
            const selectedGhc = opts.resolveGhcVersion(options, currentGhcVersion, yield buildTool.supportedGhcVersions(sourceDir));
            options['ghc-version'] = selectedGhc.version;
            // Determine whether or not we can use the pre-installed build tools:
            let requireSetup = false;
            if (options['ghc-version'] !== 'recommended' &&
                options['ghc-version'] !== 'latest' &&
                options['ghc-version'] !== currentGhcVersion) {
                core.info(`Building with specified options requires a different GHC version`);
                requireSetup = true;
            }
            if (options['cabal-version'] !== 'latest' &&
                options['cabal-version'] !== currentCabalVersion) {
                core.info(`Building with specified options requires a different Cabal version`);
                requireSetup = true;
            }
            if (options['enable-stack']) {
                core.info(`Building with specified options requires Stack`);
                requireSetup = true;
            }
            return {
                sourceDir,
                buildTool,
                requireSetup,
                matchingGhcVersionsThatCanBuildAgda: selectedGhc.matchingVersionsThatCanBuildAgda
            };
        }));
        // 3. Setup GHC via <haskell/actions/setup>:
        if (buildInfo.requireSetup) {
            core.info('📞 Calling "haskell/actions/setup"');
            yield (0, setup_haskell_1.default)(options);
        }
        // 4. Install ICU:
        if (opts.needsIcu(options)) {
            yield core.group('🔠 Installing ICU', () => __awaiter(this, void 0, void 0, function* () {
                try {
                    yield icu.setup(options);
                }
                catch (error) {
                    core.info('If this fails, try setting "disable-cluster-counting"');
                    throw error;
                }
            }));
        }
        // 5. Build:
        const agdaDir = opts.installDir(options['agda-version']);
        yield core.group('🏗 Building Agda', () => __awaiter(this, void 0, void 0, function* () {
            const { buildTool, sourceDir, matchingGhcVersionsThatCanBuildAgda } = buildInfo;
            yield buildTool.build(sourceDir, agdaDir, options, matchingGhcVersionsThatCanBuildAgda);
            yield util.cpR(path.join(sourceDir, 'src', 'data'), agdaDir);
        }));
        // 6. Test:
        yield core.group('👩🏾‍🔬 Testing Agda build', () => __awaiter(this, void 0, void 0, function* () {
            return yield util.agdaTest({
                agdaBin: path.join(agdaDir, 'bin', util.agdaBinName),
                agdaDataDir: path.join(agdaDir, 'data')
            });
        }));
        // 7. If 'bdist-upload' is specified, upload as a package:
        if (options['bdist-upload']) {
            yield core.group('📦 Upload package', () => __awaiter(this, void 0, void 0, function* () {
                const bdistName = yield (0, upload_bdist_1.default)(agdaDir, options);
                core.info(`Uploaded package as '${bdistName}'`);
            }));
        }
        return agdaDir;
    });
}
exports.default = buildFromSource;
