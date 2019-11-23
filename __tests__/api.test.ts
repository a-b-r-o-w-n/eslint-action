import * as github from '@actions/github';

import { fetchFilesBatchPR } from '../src/api';

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
