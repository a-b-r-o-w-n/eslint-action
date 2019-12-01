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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/* eslint-disable @typescript-eslint/camelcase */
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const eslint_1 = __importDefault(require("eslint"));
const fileUtils_1 = require("./fileUtils");
const { GITHUB_WORKSPACE } = process.env;
const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
const CHECK_NAME = 'ESLint';
const getPrNumber = () => {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return;
    }
    return pullRequest.number;
};
const getSha = () => {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return github.context.sha;
    }
    return pullRequest.head.sha;
};
const processArrayInput = (key, required = false) => {
    return core
        .getInput(key, { required })
        .split(',')
        .map(e => e.trim());
};
function lint(files) {
    const extensions = processArrayInput('extensions', true);
    const ignoreGlob = processArrayInput('ignore');
    const linter = new eslint_1.default.CLIEngine({
        extensions,
        ignorePattern: ignoreGlob,
    });
    return linter.executeOnFiles(files);
}
function processReport(report) {
    const { errorCount, results } = report;
    const annotations = [];
    for (const result of results) {
        const { filePath, messages } = result;
        for (const lintMessage of messages) {
            const { line, severity, ruleId, message } = lintMessage;
            core.debug(`Level ${severity} issue found on line ${line} [${ruleId}] ${message}`);
            // if ruleId is null, it's likely a parsing error, so let's skip it
            if (!ruleId) {
                continue;
            }
            annotations.push({
                path: filePath.replace(`${GITHUB_WORKSPACE}/`, ''),
                start_line: line,
                end_line: line,
                annotation_level: severity === 2 ? 'failure' : 'warning',
                message: `[${ruleId}] ${message}`,
            });
        }
    }
    return {
        conclusion: errorCount > 0 ? 'failure' : 'success',
        output: {
            title: CHECK_NAME,
            summary: `${errorCount} error(s) found`,
            annotations,
        },
    };
}
function run() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function* () {
        const token = core.getInput('repo-token', { required: true });
        const filesGlob = processArrayInput('files');
        const prNumber = getPrNumber();
        try {
            const oktokit = new github.GitHub(token);
            core.info(`PR: ${prNumber}, SHA: ${getSha()}`);
            core.debug('Fetching files to lint.');
            const files = yield fileUtils_1.getChangedFiles(oktokit, filesGlob, prNumber, getSha());
            core.debug(`${files.length} files match ${filesGlob}.`);
            if (files.length > 0) {
                const { data: { id: checkId }, } = yield oktokit.checks.create({
                    owner: OWNER,
                    repo: REPO,
                    started_at: new Date().toISOString(),
                    head_sha: getSha(),
                    status: 'in_progress',
                    name: CHECK_NAME,
                });
                const report = lint(files);
                const payload = processReport(report);
                const maxChunk = 50;
                if (((_b = (_a = payload) === null || _a === void 0 ? void 0 : _a.output) === null || _b === void 0 ? void 0 : _b.annotations.length) > maxChunk) {
                    const chunks = Math.ceil(payload.output.annotations.length / maxChunk);
                    core.info(`There were ${payload.output.annotations.length} annotations, splitting into ${chunks} requests`);
                    for (let index = 0; index < chunks; index++) {
                        const startIndex = index * maxChunk;
                        core.info(`Applying annotations ${startIndex} to ${startIndex + maxChunk}...`);
                        const returnValue = yield oktokit.checks.update({
                            owner: OWNER,
                            repo: REPO,
                            completed_at: new Date().toISOString(),
                            status: 'completed',
                            check_run_id: checkId,
                            conclusion: payload.conclusion,
                            output: Object.assign(Object.assign({}, payload.output), { annotations: payload.output.annotations.slice(startIndex, startIndex + maxChunk) }),
                        });
                        core.debug(`Got response with status of ${returnValue.status}, ${returnValue.data}`);
                    }
                }
                else if (((_d = (_c = payload) === null || _c === void 0 ? void 0 : _c.output) === null || _d === void 0 ? void 0 : _d.annotations.length) <= maxChunk) {
                    yield oktokit.checks.update(Object.assign({ owner: OWNER, repo: REPO, completed_at: new Date().toISOString(), status: 'completed', check_run_id: checkId }, payload));
                }
            }
            else {
                core.info('No files to lint.');
            }
        }
        catch (err) {
            core.setFailed(err.message ? err.message : 'Error linting files.');
        }
    });
}
run();
