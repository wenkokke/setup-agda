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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
exports.simver = exports.ensureError = void 0;
__exportStar(require("./util/agda"), exports);
var ensure_error_1 = require("./util/ensure-error");
Object.defineProperty(exports, "ensureError", { enumerable: true, get: function () { return __importDefault(ensure_error_1).default; } });
__exportStar(require("./util/exec"), exports);
__exportStar(require("./util/haskell"), exports);
__exportStar(require("./util/homebrew"), exports);
__exportStar(require("./util/pacman"), exports);
__exportStar(require("./util/patch-binary"), exports);
__exportStar(require("./util/patch-permissions"), exports);
__exportStar(require("./util/pkg-config"), exports);
exports.simver = __importStar(require("./util/simver"));
