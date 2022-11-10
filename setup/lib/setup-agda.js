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
const node_assert_1 = __importDefault(require("node:assert"));
const path = __importStar(require("node:path"));
const opts = __importStar(require("./opts"));
const build_from_sdist_1 = __importDefault(require("./setup-agda/build-from-sdist"));
const install_from_bdist_1 = __importDefault(require("./setup-agda/install-from-bdist"));
const install_from_tool_cache_1 = __importDefault(require("./setup-agda/install-from-tool-cache"));
const setup_agda_stdlib_1 = __importDefault(require("./setup-agda-stdlib"));
const util = __importStar(require("./util"));
function setup(options) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // 1. Find an existing Agda build or build from source:
            let agdaDir = null;
            // 1.1. Try the GitHub Tool Cache:
            if (!options['force-build'] && agdaDir === null)
                agdaDir = yield core.group(`🔍 Searching for Agda ${options['agda-version']} in tool cache`, () => __awaiter(this, void 0, void 0, function* () { return yield (0, install_from_tool_cache_1.default)(options); }));
            // 1.2. Try the custom package index:
            if (!options['force-build'] && agdaDir === null)
                agdaDir = yield core.group(`🔍 Searching for Agda ${options['agda-version']} in package index`, () => __awaiter(this, void 0, void 0, function* () { return yield (0, install_from_bdist_1.default)(options); }));
            // 1.3. Build from source:
            if (!options['force-no-build'] && agdaDir === null)
                agdaDir = yield (0, build_from_sdist_1.default)(options);
            else if (agdaDir === null)
                throw Error('Required build, but "force-no-build" is set.');
            // 2. Set environment variables:
            const installDir = opts.installDir(options['agda-version']);
            yield core.group(`🚀 Install Agda ${options['agda-version']}`, () => __awaiter(this, void 0, void 0, function* () {
                (0, node_assert_1.default)(agdaDir !== null, `Variable 'agdaDir' was mutated after build tasks finished. Did you forget an 'await'?`);
                if (installDir !== agdaDir) {
                    core.info(`Install Agda to ${installDir}`);
                    yield util.mkdirP(path.dirname(installDir));
                    yield util.cpR(agdaDir, installDir);
                    try {
                        yield util.rmRF(agdaDir);
                    }
                    catch (error) {
                        core.info(`Failed to clean up build: ${util.ensureError(error).message}`);
                    }
                }
                yield util.configureEnvFor(installDir);
            }));
            // 3. Test:
            yield core.group('👩🏾‍🔬 Testing Agda installation', () => __awaiter(this, void 0, void 0, function* () { return yield util.agdaTest(); }));
            // 4. Setup agda-stdlib:
            yield (0, setup_agda_stdlib_1.default)(options);
        }
        catch (error) {
            core.setFailed(util.ensureError(error));
        }
    });
}
exports.default = setup;
