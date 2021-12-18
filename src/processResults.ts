import { ESLint, Linter } from "eslint";

import inputs from "./inputs";

const { GITHUB_WORKSPACE } = process.env;

function formatMessage(filePath: string, result: Linter.LintMessage) {
  const { ruleId, line, column, message } = result;

  let output = `file=${filePath}`;

  if (line) {
    output += `,line=${line}`;
  }

  if (column) {
    output += `,col=${column}`;
  }

  output += `::[${ruleId}] ${message}`;

  return output;
}

export function processResults(lintResults: ESLint.LintResult[]): number {
  let errorCount = 0;

  for (const result of lintResults) {
    const { filePath, messages } = result;
    const relFilePath = filePath.replace(`${GITHUB_WORKSPACE}/`, "");

    for (const message of messages) {
      if (!message.ruleId) {
        continue;
      }

      switch (message.severity) {
        // warning
        case 1:
          if (inputs.quiet) break;

          console.log("::warning", formatMessage(relFilePath, message));
          break;
        // error
        case 2:
          errorCount++;

          console.log("::error", formatMessage(relFilePath, message));
          break;
        default:
          break;
      }
    }
  }

  return errorCount;
}
