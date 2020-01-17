import fs from 'fs';
import path from 'path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import micromatch from 'micromatch';

import { fetchFilesBatchPR, fetchFilesBatchCommit } from './api';

export const filterFiles = (files: string[], globs: string[]): string[] => {
  const result: string[] = [];
  const filtered = micromatch(files, globs);

  for (const file of filtered) {
    if (fs.existsSync(path.resolve(file))) {
      result.push(path.resolve(file));
    }
  }

  return result;
};

async function getFilesFromPR(client: github.GitHub, prNumber: number): Promise<string[]> {
  let files: string[] = [];
  let hasNextPage = true;
  let startCursor: string | undefined = undefined;

  while (hasNextPage) {
    try {
      const result = await fetchFilesBatchPR(client, prNumber, startCursor);

      files = files.concat(result.files);
      hasNextPage = result.hasNextPage;
      startCursor = result.endCursor;
    } catch (err) {
      core.error(err);
      core.setFailed('Error occurred getting changed files.');
      hasNextPage = false;
    }
  }

  return files;
}

export async function getChangedFiles(
  client: github.GitHub,
  filesGlob: string[],
  prNumber: number | undefined,
  sha: string
): Promise<string[]> {
  let files: string[] = [];

  if (prNumber) {
    files = await getFilesFromPR(client, prNumber);
  } else {
    files = await fetchFilesBatchCommit(client, sha);
  }

  return filterFiles(files, filesGlob);
}
