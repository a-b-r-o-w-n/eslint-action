import * as core from '@actions/core';
import * as github from '@actions/github';

import { fetchFilesBatchPR, fetchFilesBatchCommit } from '../src/api';

import { getCommit as getCommitResponse } from './fixtures';

jest.mock('@actions/core');
jest.mock('@actions/github');

describe('fetchFilesBatchPR', () => {
  const client = new github.GitHub('some-token');
  const prNumber = 123;
  const startCursor = 'cursor-1';
  const owner = 'myorg';
  const repo = 'my-repo';

  beforeEach(() => {
    client.graphql = jest.fn();

    (client.graphql as jest.Mock).mockResolvedValue({
      repository: {},
    });
  });

  it('makes a graphql query', async () => {
    await fetchFilesBatchPR(client, prNumber, startCursor, owner, repo);

    expect(client.graphql).toHaveBeenCalledWith(expect.any(String), {
      owner,
      repo,
      prNumber,
      startCursor,
    });
  });

  describe('when PR not found', () => {
    it('returns empty array', async () => {
      expect(await fetchFilesBatchPR(client, prNumber, startCursor, owner, repo)).toEqual({ files: [] });
    });
  });

  describe('when PR found', () => {
    beforeEach(() => {
      (client.graphql as jest.Mock).mockResolvedValue({
        repository: {
          pullRequest: {
            files: {
              pageInfo: {
                hasNextPage: true,
                endCursor: 'cursor-2',
              },
              edges: [
                {
                  node: {
                    path: 'file-1',
                  },
                },
                {
                  node: {
                    path: 'file-2',
                  },
                },
              ],
            },
          },
        },
      });
    });

    it('returns list of files and pageInfo', async () => {
      expect(await fetchFilesBatchPR(client, prNumber, startCursor, owner, repo)).toEqual({
        files: ['file-1', 'file-2'],
        hasNextPage: true,
        endCursor: 'cursor-2',
      });
    });
  });
});

describe('fetchFilesBatchCommit', () => {
  const client = new github.GitHub('some-token');
  const sha = 'abc123';
  const owner = 'myorg';
  const repo = 'my-repo';

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore : missing endpoint property
    client.repos.getCommit = jest.fn();
    // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
    // @ts-ignore
    (client.repos.getCommit as jest.Mock).mockResolvedValue({ data: getCommitResponse });
  });

  it('fetches commit info using v3 api', async () => {
    await fetchFilesBatchCommit(client, sha, owner, repo);
    expect(client.repos.getCommit).toHaveBeenCalledWith({
      owner,
      repo,
      ref: sha,
    });
  });

  describe('when response is valid', () => {
    it('returns list of filenames', async () => {
      expect(await fetchFilesBatchCommit(client, sha, owner, repo)).toEqual([
        '.github/workflows/main.yml',
        'action.yml',
        'lib/eslint-action.js',
        'node_modules/minimatch/package.json',
        'package.json',
        'src/eslint-action.ts',
        'src/types.d.ts',
      ]);
    });
  });

  describe('when there is an error', () => {
    const error = new Error('Bad Request');

    beforeEach(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
      // @ts-ignore
      (client.repos.getCommit as jest.Mock).mockRejectedValue(error);
    });

    it('logs an error to console', async () => {
      await fetchFilesBatchCommit(client, sha, owner, repo);
      expect(core.error).toHaveBeenCalledWith(error);
    });

    it('returns an empty array', async () => {
      expect(await fetchFilesBatchCommit(client, sha, owner, repo)).toEqual([]);
    });
  });
});
