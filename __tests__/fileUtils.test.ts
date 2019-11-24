import fs from 'fs';
import path from 'path';

import * as github from '@actions/github';

import * as api from '../src/api';
import { filterFiles, getChangedFiles } from '../src/fileUtils';

jest.mock('fs');
jest.mock('path');
jest.mock('@actions/github');
jest.mock('../src/api');

beforeEach(() => {
  Object.defineProperty(github, 'context', {
    value: {
      repo: {
        owner: 'oktocat',
        repo: 'my-repo',
      },
    },
  });
});

describe('getChangedFiles', () => {
  const client = new github.GitHub('some-token');
  const filesGlob = ['**/*.js'];
  const sha = '123abc';

  describe('when change is a pull request', () => {
    it('fetches all changed files from PR', async () => {
      (api.fetchFilesBatchPR as jest.Mock)
        .mockResolvedValueOnce({
          files: ['first-file'],
          hasNextPage: true,
          endCursor: 'cursor-1',
        })
        .mockResolvedValueOnce({
          files: ['last-file'],
          hasNextPage: false,
          endCursor: 'cursor-2',
        });
      const prNumber = 123;

      await getChangedFiles(client, filesGlob, prNumber, sha);

      expect(api.fetchFilesBatchPR).toHaveBeenCalledTimes(2);
      expect(api.fetchFilesBatchPR).toHaveBeenCalledWith(client, prNumber, undefined);
      expect(api.fetchFilesBatchPR).toHaveBeenCalledWith(client, prNumber, 'cursor-1');
    });
  });

  describe('when change is a commit', () => {
    beforeEach(() => {
      (api.fetchFilesBatchCommit as jest.Mock).mockResolvedValue([]);
    });

    it('fetches changed files for commit', async () => {
      await getChangedFiles(client, filesGlob, undefined, sha);
      expect(api.fetchFilesBatchCommit).toHaveBeenCalledWith(client, sha);
    });
  });
});

describe('filterByGlob', () => {
  it('returns files that match any glob pattern', () => {
    (path.resolve as jest.Mock).mockImplementation(path => path);
    (fs.existsSync as jest.Mock).mockImplementation(() => true);

    const globs = ['src/**/*', 'test/**/*.js'];
    const files = ['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/bar.ts', 'test/foo/baz.js', 'config/env.json'];

    expect(filterFiles(files, globs)).toEqual(['src/foo/bar.ts', 'src/foo/baz.js', 'test/foo/baz.js']);
  });

  it('filters deleted files', () => {
    (path.resolve as jest.Mock).mockImplementation(path => path);
    (fs.existsSync as jest.Mock).mockImplementation(path => !path.includes('deleted-file'));

    const globs = ['src/**/*', 'test/**/*.js'];
    const files = ['src/foo/bar.ts', 'src/foo/baz.js', 'src/deleted-file.js'];

    expect(filterFiles(files, globs)).toEqual(['src/foo/bar.ts', 'src/foo/baz.js']);
  });
});
