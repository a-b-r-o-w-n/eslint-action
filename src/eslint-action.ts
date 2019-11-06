import * as core from '@actions/core';
import * as github from '@actions/github';
import eslint from 'eslint';

const getPrNumber = (): number | undefined => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  return pullRequest.number;
};

const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;

interface PrResponse {
  endCursor?: string;
  hasNextPage?: boolean;
  files: string[];
}

async function fetchFilesBatch(client: github.GitHub, prNumber: number, startCursor?: string): Promise<PrResponse> {
  const results = await client.graphql(`
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

  return {
    ...pr.files.pageInfo,
    files: pr.files.edges.map(e => e.node.path)
  };
}

async function getChangedFiles(client: github.GitHub, prNumber: number) {
  let files: string[] = [];
  let hasNextPage = true;
  let startCursor: string | undefined = undefined;

  while (hasNextPage) {
    const result = await fetchFilesBatch(client, prNumber, startCursor);

    files = files.concat(result.files);
    hasNextPage = result.hasNextPage;
    startCursor = result.endCursor;
  }

  return files;
}

async function run() {
  const token = core.getInput('repo-token', { required: true });
  const prNumber = getPrNumber();

  if (!prNumber) {
    return;
  }


  const oktokit = new github.GitHub(token);

  console.log(await getChangedFiles(oktokit, prNumber));
}

run();
