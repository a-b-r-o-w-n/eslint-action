import * as github from "@actions/github";

export function getPrNumber(): number | undefined {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return;
  }

  return pullRequest.number;
}

export function getSha(): string {
  const pullRequest = github.context.payload.pull_request;

  if (!pullRequest) {
    return github.context.sha;
  }

  return pullRequest.head.sha;
}
