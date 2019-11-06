/* eslint-disable @typescript-eslint/camelcase */
import * as core from '@actions/core';
import * as github from '@actions/github';
import eslint from 'eslint';
import minimatch from 'minimatch';

const getPrNumber = (): number | undefined => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  return pullRequest.number;
};

const filterByGlob = (globs: string[]) => (file: string): boolean => {
  for (const glob of globs) {
    if (minimatch(file, glob)) {
      return true;
    }
  }

  return false;
};

const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;

interface PrResponse {
  endCursor?: string;
  hasNextPage?: boolean;
  files: string[];
}

async function fetchFilesBatch(client: github.GitHub, prNumber: number, startCursor?: string): Promise<PrResponse> {
  const { repository } = await client.graphql(
    `
    query ChangedFilesbatch($owner: String!, $repo: String!, $prNumber: Int!, $startCursor: String) {
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
  `,
    { owner: OWNER, repo: REPO, prNumber, startCursor }
  );

  const pr = repository.pullRequest;

  if (!pr || !pr.files) {
    return { files: [] };
  }

  return {
    ...pr.files.pageInfo,
    files: pr.files.edges.map(e => e.node.path),
  };
}

async function getChangedFiles(client: github.GitHub, prNumber: number, filesGlob: string[]): Promise<string[]> {
  let files: string[] = [];
  let hasNextPage = true;
  let startCursor: string | undefined = undefined;

  while (hasNextPage) {
    try {
      const result = await fetchFilesBatch(client, prNumber, startCursor);

      files = files.concat(result.files);
      hasNextPage = result.hasNextPage;
      startCursor = result.endCursor;
    } catch (err) {
      core.error(err);
      core.setFailed('Error occurred getting changed files.');
      return files.filter(filterByGlob(filesGlob));
    }
  }

  return files.filter(filterByGlob(filesGlob));
}

async function run(): Promise<void> {
  const token = core.getInput('repo-token', { required: true });
  const extensions = core
    .getInput('extensions', { required: true })
    .split(',')
    .map(e => e.trim());
  const filesGlob = core
    .getInput('files')
    .split(',')
    .map(e => e.trim());
  const ignoreGlob = core
    .getInput('ignore')
    .split(',')
    .map(e => e.trim());
  const prNumber = getPrNumber();

  if (!prNumber) {
    return;
  }

  try {
    const oktokit = new github.GitHub(token);

    const {
      data: { id: checkId },
    } = await oktokit.checks.create({
      owner: OWNER,
      repo: REPO,
      started_at: new Date().toISOString(),
      head_sha: github.context.sha,
      status: 'in_progress',
      name: 'Eslint',
    });

    const files = await getChangedFiles(oktokit, prNumber, filesGlob);

    const linter = new eslint.CLIEngine({
      extensions,
      ignorePattern: ignoreGlob,
    });

    const results = linter.executeOnFiles(files);

    console.log(results);

    await oktokit.checks.update({
      owner: OWNER,
      repo: REPO,
      completed_at: new Date().toISOString(),
      status: 'completed',
      check_run_id: checkId,
      conclusion: 'success',
    });
  } catch (err) {
    core.error(err);
    core.setFailed('Error linting files.');
  }
}

run();
