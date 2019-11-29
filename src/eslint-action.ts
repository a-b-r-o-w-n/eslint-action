/* eslint-disable @typescript-eslint/camelcase */
import * as core from '@actions/core';
import * as github from '@actions/github';
import eslint, { CLIEngine } from 'eslint';
import { ChecksUpdateParams, ChecksUpdateParamsOutputAnnotations } from '@octokit/rest';

import { getChangedFiles } from './fileUtils';

const { GITHUB_WORKSPACE } = process.env;
const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
const CHECK_NAME = 'Eslint';

const getPrNumber = (): number | undefined => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  return pullRequest.number;
};

const getSha = (): string => {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return github.context.sha;
  }

  return pullRequest.head.sha;
};

const processArrayInput = (key: string, required = false): string[] => {
  return core
    .getInput(key, { required })
    .split(',')
    .map(e => e.trim());
};

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

    for (const lintMessage of messages) {
      const { line, severity, ruleId, message } = lintMessage;

      if (severity !== 2) {
        continue;
      }

      annotations.push({
        path: filePath.replace(`${GITHUB_WORKSPACE}/`, ''),
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
      title: CHECK_NAME,
      summary: `${errorCount} error(s) found`,
      annotations,
    },
  };
}

async function run(): Promise<void> {
  const token = core.getInput('repo-token', { required: true });
  const filesGlob = processArrayInput('files');
  const prNumber = getPrNumber();

  try {
    const oktokit = new github.GitHub(token);
    core.debug('Fetching files to lint.');
    core.info(`filesGlob: ${filesGlob}, prNumber: ${prNumber}, getSha(): ${getSha()}`);
    const files = await getChangedFiles(oktokit, filesGlob, prNumber, getSha());
    core.info(`${files.length} files match ${filesGlob}.`);

    if (files.length > 0) {
      const {
        data: { id: checkId },
      } = await oktokit.checks.create({
        owner: OWNER,
        repo: REPO,
        started_at: new Date().toISOString(),
        head_sha: getSha(),
        status: 'in_progress',
        name: CHECK_NAME,
      });
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
    } else {
      core.info('No files to lint.');
    }
  } catch (err) {
    core.setFailed(err.message ? err.message : 'Error linting files.');
  }
}

run();
