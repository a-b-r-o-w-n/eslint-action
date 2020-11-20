import * as core from "@actions/core";
import { RestEndpointMethodTypes } from "@octokit/rest";
import { ESLint } from "eslint";

import inputs from "./inputs";

const { GITHUB_WORKSPACE } = process.env;

export const CHECK_NAME = "ESLint";

export function processResults(
  results: ESLint.LintResult[]
): Partial<RestEndpointMethodTypes["checks"]["update"]["parameters"]> {
  const annotations: any[] = [];

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
      } else if (inputs.quiet) {
        // skip message if quiet is true
        continue;
      }

      annotations.push({
        path: filePath.replace(`${GITHUB_WORKSPACE}/`, ""),
        start_line: line,
        end_line: line,
        annotation_level: severity === 2 ? "failure" : "warning",
        message: `[${ruleId}] ${message}`,
      });
    }
  }

  return {
    conclusion: errorCount > 0 ? "failure" : "success",
    output: {
      title: CHECK_NAME,
      summary: `${errorCount} error(s) found`,
      annotations,
    },
  };
}
