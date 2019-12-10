/* eslint-disable @typescript-eslint/camelcase */
import * as core from '@actions/core';
import * as github from '@actions/github';
import eslint, { CLIEngine } from 'eslint';
import { ChecksUpdateParams, ChecksUpdateParamsOutputAnnotations } from '@octokit/rest';

import { getChangedFiles } from './fileUtils';

const { GITHUB_WORKSPACE } = process.env;
const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;
const CHECK_NAME = 'ESLint';

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
  const { results } = report;
  const annotations: ChecksUpdateParamsOutputAnnotations[] = [];

  let errorCount = 0;

  for (const result of results) {
    const { filePath, messages } = result;

    for (const lintMessage of messages) {
      const { line, severity, ruleId, message } = lintMessage;

      core.debug(`Level ${severity} issue found on line ${line} [${ruleId}] ${message}`);

      // if ruleId is null, it's likely a parsing error, so let's skip it
      if (!ruleId) {
        continue;
      }

      if (severity === 2) {
        errorCount++;
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

async function run(): Promise<void> {
  const token = core.getInput('repo-token', { required: true });
  const filesGlob = processArrayInput('files');
  const prNumber = getPrNumber();

  try {
    const oktokit = new github.GitHub(token);
    core.info(`PR: ${prNumber}, SHA: ${getSha()}`);
    core.debug('Fetching files to lint.');
    const files = await getChangedFiles(oktokit, filesGlob, prNumber, getSha());
    core.debug(`${files.length} files match ${filesGlob}.`);

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
      const maxChunk = 50;

      if (payload?.output?.annotations.length > maxChunk) {
        const chunks = Math.ceil(payload.output.annotations.length / maxChunk);
        core.info(`There were ${payload.output.annotations.length} annotations, splitting into ${chunks} requests`);
        for (let index = 0; index < chunks; index++) {
          const startIndex = index * maxChunk;
          core.info(`Applying annotations ${startIndex} to ${startIndex + maxChunk}...`);
          const returnValue = await oktokit.checks.update({
            owner: OWNER,
            repo: REPO,
            completed_at: new Date().toISOString(),
            status: startIndex + maxChunk <= payload.output.annotations.length ? 'in_progress' : 'completed',
            check_run_id: checkId,
            conclusion: payload.conclusion,
            output: {
              ...payload.output,
              annotations: payload.output.annotations.slice(startIndex, startIndex + maxChunk),
            },
          });
          core.debug(`Got response with status of ${returnValue.status}, ${returnValue.data}`);
        }
      } else if (payload?.output?.annotations.length <= maxChunk) {
        await oktokit.checks.update({
          owner: OWNER,
          repo: REPO,
          completed_at: new Date().toISOString(),
          status: 'completed',
          check_run_id: checkId,
          ...payload,
        });
      }
    } else {
      core.info('No files to lint.');
    }
  } catch (err) {
    core.setFailed(err.message ? err.message : 'Error linting files.');
  }
}

run();
