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
var _a, _b, _c, _d, _e, _f;
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const OWNER = (_c = (_b = (_a = github) === null || _a === void 0 ? void 0 : _a.context) === null || _b === void 0 ? void 0 : _b.repo) === null || _c === void 0 ? void 0 : _c.owner;
const REPO = (_f = (_e = (_d = github) === null || _d === void 0 ? void 0 : _d.context) === null || _e === void 0 ? void 0 : _e.repo) === null || _f === void 0 ? void 0 : _f.repo;
function fetchFilesBatchPR(client, prNumber, startCursor, owner = OWNER, repo = REPO) {
    return __awaiter(this, void 0, void 0, function* () {
        const { repository } = yield client.graphql(`
    query ChangedFilesBatch($owner: String!, $repo: String!, $prNumber: Int!, $startCursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          files(first: 100, after: $startCursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
            edges {
              cursor
              node {
                path
              }
            }
          }
        }
      }
    }
  `, { owner, repo, prNumber, startCursor });
        const pr = repository.pullRequest;
        if (!pr || !pr.files) {
            core.info(`No PR or PR files detected`);
            return { files: [] };
        }
        core.info(`PR with files detected: ${pr.files.edges.map(e => e.node.path)}`);
        return Object.assign(Object.assign({}, pr.files.pageInfo), { files: pr.files.edges.map(e => e.node.path) });
    });
}
exports.fetchFilesBatchPR = fetchFilesBatchPR;
/**
 * Gets a list of all the files modified in this commit
 *
 * @param client The Octokit instance
 * @param sha The SHA for the Commit
 * @param owner The Owner of the Repository
 * @param repo The Repository name (slug)
 *
 * @returns string[] An Array of the file paths modified in this commit, relative to the repository root
 */
function fetchFilesBatchCommit(client, sha, owner = OWNER, repo = REPO) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const resp = yield client.repos.getCommit({
                owner,
                repo,
                ref: sha,
            });
            const filesChanged = resp.data.files.map(f => f.filename);
            core.info(`Files changed: ${filesChanged}`);
            return filesChanged;
        }
        catch (err) {
            core.error(err);
            return [];
        }
    });
}
exports.fetchFilesBatchCommit = fetchFilesBatchCommit;
