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
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const github = __importStar(require("@actions/github"));
const getPrNumber = () => {
    const pullRequest = github.context.payload.pull_request;
    if (!pullRequest) {
        return;
    }
    return pullRequest.number;
};
const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
function fetchFilesBatch(client, prNumber, startCursor) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield client.graphql(`
    query {
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
  `, { owner: OWNER, repo: REPO, prNumber, startCursor });
        const pr = results.data.pullRequest;
        if (!pr || !pr.files) {
            return { files: [] };
        }
        return Object.assign(Object.assign({}, pr.files.pageInfo), { files: pr.files.edges.map(e => e.node.path) });
    });
}
function getChangedFiles(client, prNumber) {
    return __awaiter(this, void 0, void 0, function* () {
        let files = [];
        let hasNextPage = true;
        let startCursor = undefined;
        while (hasNextPage) {
            const result = yield fetchFilesBatch(client, prNumber, startCursor);
            files = files.concat(result.files);
            hasNextPage = result.hasNextPage;
            startCursor = result.endCursor;
        }
        return files;
    });
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        const token = core.getInput('repo-token', { required: true });
        const prNumber = getPrNumber();
        if (!prNumber) {
            return;
        }
        const oktokit = new github.GitHub(token);
        console.log(yield getChangedFiles(oktokit, prNumber));
    });
}
run();