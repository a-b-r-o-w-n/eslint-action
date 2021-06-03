import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";

import { getChangedFiles } from "./fileUtils";
import { getPrNumber, getSha } from "./githubUtils";
import inputs from "./inputs";
import { lint } from "./lint";
import { processResults } from "./processResults";

const OWNER = github.context.repo.owner;
const REPO = github.context.repo.repo;

async function run(): Promise<void> {
  const prNumber = getPrNumber();

  try {
    const octokit = new Octokit({
      auth: inputs.token,
      log: {
        debug: core.debug,
        info: core.info,
        warn: core.warning,
        error: core.error,
      },
    });
    core.info(`PR: ${prNumber}, SHA: ${getSha()}, OWNER: ${OWNER}, REPO: ${REPO}`);
    core.debug("Fetching files to lint.");
    const files = await getChangedFiles(octokit, inputs.files, prNumber, getSha());
    core.debug(`${files.length} files match ${inputs.files}.`);

    if (files.length > 0) {
      const report = await lint(files);
      const errorCount = processResults(report);

      if (errorCount > 0) {
        core.setFailed(`${errorCount} error(s) found.`);
      }
    } else {
      core.info("No files to lint.");
    }
  } catch (err) {
    core.setFailed(err.message ? err.message : "Error linting files.");
  }
}

run();
