/* eslint-disable @typescript-eslint/camelcase */
import * as core from '@actions/core';
import * as github from '@actions/github';
import eslint, { CLIEngine } from 'eslint';
import minimatch from 'minimatch';
import { ChecksUpdateParams, ChecksUpdateParamsOutputAnnotations } from '@octokit/rest';

const getPrNumber = (): number | undefined => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  return pullRequest.number;
};

const processArrayInput = (key: string, required = false): string[] => {
  return core
    .getInput(key, { required })
    .split(',')
    .map(e => e.trim());
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

function lint(files: string[]): CLIEngine.LintReport {
  const extensions = processArrayInput('extensions', true);
  const ignoreGlob = processArrayInput('ignore');

  const linter = new eslint.CLIEngine({
    extensions,
    ignorePattern: ignoreGlob,
  });

  return linter.executeOnFiles(files);
}

function processReport(report: CLIEngine.LintReport): Partial<ChecksUpdateParams> {
  const { errorCount, results } = report;
  const annotations: ChecksUpdateParamsOutputAnnotations[] = [];

  for (const result of results) {
    const { filePath, messages } = result;

    console.log(filePath);
    for (const lintMessage of messages) {
      const { line, severity, ruleId, message } = lintMessage;

      if (severity !== 2) {
        continue;
      }

      annotations.push({
        path: filePath.replace(`${process.env.GITHUB_WORKSPACE || ''}/`, ''),
        start_line: line,
        end_line: line,
        annotation_level: 'failure',
        message: `[${ruleId}] ${message}`,
      });
    }
  }

  return {
    conclusion: errorCount > 0 ? 'failure' : 'success',
    output: {
      title: 'Eslint',
      summary: `${errorCount} error(s) found`,
      annotations,
    },
  };
}

async function run(): Promise<void> {
  const token = core.getInput('repo-token', { required: true });
  const filesGlob = processArrayInput('files');
  const prNumber = getPrNumber();

  if (!prNumber) {
    return;
  }

  console.log(JSON.stringify(github.context.payload, null, 2));

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

    const report = lint(files);
    const payload = processReport(report);

    await oktokit.checks.update({
      owner: OWNER,
      repo: REPO,
      completed_at: new Date().toISOString(),
      status: 'completed',
      check_run_id: checkId,
      ...payload,
    });
  } catch (err) {
    core.error(err);
    core.setFailed('Error linting files.');
  }
}

run();
