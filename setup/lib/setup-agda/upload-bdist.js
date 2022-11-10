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
exports.renderName = void 0;
const artifact = __importStar(require("@actions/artifact"));
const core = __importStar(require("@actions/core"));
const glob = __importStar(require("@actions/glob"));
const Mustache = __importStar(require("mustache"));
const os = __importStar(require("node:os"));
const path = __importStar(require("node:path"));
const object_pick_1 = __importDefault(require("object.pick"));
const opts = __importStar(require("../opts"));
const icu = __importStar(require("../setup-icu"));
const setup_upx_1 = __importDefault(require("../setup-upx"));
const util = __importStar(require("../util"));
function uploadBdist(installDir, options) {
    return __awaiter(this, void 0, void 0, function* () {
        // Get the name for the distribution:
        const bdistName = renderName(options['bdist-name'], options);
        const bdistDir = path.join(opts.agdaDir(), 'bdist', bdistName);
        yield util.mkdirP(bdistDir);
        // Copy binaries & data:
        yield util.cpR(path.join(installDir, 'bin'), bdistDir);
        yield util.cpR(path.join(installDir, 'data'), bdistDir);
        // Bundle libraries:
        if (options['icu-version'] !== undefined) {
            yield icu.bundle(bdistDir, options);
        }
        // Compress binaries:
        if (options['bdist-compress-exe']) {
            try {
                const upxExe = yield (0, setup_upx_1.default)(options);
                for (const binName of util.agdaBinNames)
                    yield compressBin(upxExe, path.join(bdistDir, 'bin', binName));
            }
            catch (error) {
                core.info(util.ensureError(error).message);
            }
        }
        // Test artifact:
        yield util.agdaTest({
            agdaBin: path.join(bdistDir, 'bin', util.agdaBinName),
            agdaDataDir: path.join(bdistDir, 'data')
        });
        // Create file list for artifact:
        const globber = yield glob.create(path.join(bdistDir, '**', '*'), {
            followSymbolicLinks: false,
            implicitDescendants: false,
            matchDirectories: false
        });
        const files = yield globber.glob();
        // Upload artifact:
        const artifactClient = artifact.create();
        const uploadInfo = yield artifactClient.uploadArtifact(bdistName, files, bdistDir, {
            continueOnError: true,
            retentionDays: parseInt(options['bdist-retention-days'])
        });
        // Report any errors:
        if (uploadInfo.failedItems.length > 0) {
            core.error(['Failed to upload:', ...uploadInfo.failedItems].join(os.EOL));
        }
        // Return artifact name
        return uploadInfo.artifactName;
    });
}
exports.default = uploadBdist;
function compressBin(upxExe, binPath) {
    return __awaiter(this, void 0, void 0, function* () {
        // Print the needed libraries before compressing:
        yield util.printNeeded(binPath);
        // Compress with UPX:
        yield util.getOutput(upxExe, ['--best', binPath]);
        // Print the needed libraries after compressing:
        yield util.printNeeded(binPath);
    });
}
function renderName(template, options) {
    return Mustache.render(template, Object.assign(Object.assign({}, (0, object_pick_1.default)(options, [
        'agda-version',
        'ghc-version',
        'cabal-version',
        'stack-version',
        'icu-version',
        'upx-version'
    ])), { arch: os.arch(), platform: os.platform(), release: os.release() }));
}
exports.renderName = renderName;
