import * as core from "@actions/core";
import * as github from "@actions/github";
import { Octokit } from "@octokit/rest";

import { getChangedFiles } from "./fileUtils";
import { getPrNumber, getSha } from "./githubUtils";
import inputs from "./inputs";
import { lint } from "./lint";
import { CHECK_NAME, processResults } from "./processResults";

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
      const {
        data: { id: checkId },
      } = await octokit.checks.create({
        owner: OWNER,
        repo: REPO,
        started_at: new Date().toISOString(),
        head_sha: getSha(),
        status: "in_progress",
        name: CHECK_NAME,
      });
      const report = await lint(files);
      const payload = processResults(report);
      const maxChunk = 50;

      const annotationLength = payload?.output?.annotations?.length ?? 0;
      if (payload?.output) {
        if (annotationLength > maxChunk) {
          const chunks = Math.ceil(annotationLength / maxChunk);
          core.info(`There were ${annotationLength} annotations, splitting into ${chunks} requests`);
          for (let index = 0; index < chunks; index++) {
            const startIndex = index * maxChunk;
            const endIndex = startIndex + maxChunk;
            core.info(`Applying annotations ${startIndex} to ${startIndex + maxChunk}...`);
            const returnValue = await octokit.checks.update({
              owner: OWNER,
              repo: REPO,
              completed_at: new Date().toISOString(),
              status: endIndex <= annotationLength ? "in_progress" : "completed",
              check_run_id: checkId,
              conclusion: payload.conclusion,
              output: {
                ...payload.output,
                annotations: payload?.output?.annotations?.slice(startIndex, endIndex),
              },
            });
            core.debug(`Got response with status of ${returnValue.status}, ${returnValue.data}`);
          }
        } else if (annotationLength <= maxChunk) {
          await octokit.checks.update({
            owner: OWNER,
            repo: REPO,
            completed_at: new Date().toISOString(),
            status: "completed",
            check_run_id: checkId,
            ...payload,
          });
        }
      }
    } else {
      core.info("No files to lint.");
    }
  } catch (err) {
    core.setFailed(err.message ? err.message : "Error linting files.");
  }
}

run();
