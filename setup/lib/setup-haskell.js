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
const object_pick_1 = __importDefault(require("object.pick"));
const setup_haskell_1 = __importDefault(require("setup-haskell"));
const util = __importStar(require("./util"));
function setup(options) {
    return __awaiter(this, void 0, void 0, function* () {
        (0, node_assert_1.default)(options['ghc-version'] !== 'recommended');
        // Run haskell/actions/setup:
        yield (0, setup_haskell_1.default)(Object.fromEntries(Object.entries(pickSetupHaskellInputs(options)).map(e => {
            const [k, v] = e;
            if (typeof v === 'boolean')
                return [k, v ? 'true' : ''];
            else
                return [k, v];
        })));
        core.setOutput('haskell-setup', 'true');
        // Update the GHC version:
        options['ghc-version'] = yield util.ghcGetVersion((0, object_pick_1.default)(options, ['enable-stack', 'stack-no-global']));
        // Update the Cabal version:
        options['cabal-version'] = yield util.cabalGetVersion((0, object_pick_1.default)(options, ['enable-stack', 'stack-no-global']));
        // Update the Stack version:
        if (options['enable-stack']) {
            options['stack-version'] = yield util.stackGetVersion();
        }
    });
}
exports.default = setup;
function pickSetupHaskellInputs(options) {
    return (0, object_pick_1.default)(options, [
        'cabal-version',
        'disable-matcher',
        'enable-stack',
        'ghc-version',
        'stack-no-global',
        'stack-setup-ghc',
        'stack-version'
    ]);
}
