"use strict";
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const core = __importStar(require("@actions/core"));
const micromatch_1 = __importDefault(require("micromatch"));
const api_1 = require("./api");
exports.filterFiles = (files, globs) => {
    const result = [];
    const filtered = micromatch_1.default(files, globs);
    for (const file of filtered) {
        if (fs_1.default.existsSync(path_1.default.resolve(file))) {
            result.push(path_1.default.resolve(file));
        }
    }
    return result;
};
function getFilesFromPR(client, prNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        let hasNextPage = true;
        let startCursor = undefined;
        while (hasNextPage) {
            try {
                const result = yield api_1.fetchFilesBatchPR(client, prNumber, startCursor);
                files = files.concat(result.files);
                hasNextPage = result.hasNextPage;
                startCursor = result.endCursor;
            }
            catch (err) {
                core.error(err);
                core.setFailed('Error occurred getting changed files.');
                hasNextPage = false;
            }
        }
        return files;
    });
}
function getChangedFiles(client, filesGlob, prNumber, sha) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        if (prNumber) {
            files = yield getFilesFromPR(client, prNumber);
        }
        else {
            files = yield api_1.fetchFilesBatchCommit(client, sha);
        }
        return exports.filterFiles(files, filesGlob);
    });
}
exports.getChangedFiles = getChangedFiles;
