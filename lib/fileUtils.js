"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const micromatch_1 = __importDefault(require("micromatch"));
exports.filterFiles = (files, globs) => {
    const result = [];
    const filtered = micromatch_1.default(files, globs);
    for (const file of filtered) {
        if (fs_1.default.existsSync(path_1.default.resolve(file))) {
            result.push(file);
        }
    }
    return result;
};
