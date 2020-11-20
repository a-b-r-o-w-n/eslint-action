import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";

export async function fetchFilesBatchPR(
  client: Octokit,
  prNumber: number,
  owner: string,
  repo: string,
  startCursor?: string
): Promise<PrResponse> {
  const { repository } = await client.graphql(
    `
    query ChangedFilesBatch($owner: String!, $repo: String!, $prNumber: Int!, $startCursor: String) {
      repository(owner: $owner, name: $repo) {
        pullRequest(number: $prNumber) {
          files(first: 100, after: $startCursor) {
            pageInfo {
              hasNextPage
              endCursor
            }
            totalCount
            edges {
              cursor
              node {
                path
              }
            }
          }
        }
      }
    }
  `,
    { owner, repo, prNumber, startCursor }
  );

  const pr = repository.pullRequest;

  if (!pr || !pr.files) {
    core.info(`No PR or PR files detected`);
    return { files: [] };
  }

  core.info(`PR with files detected: ${pr.files.edges.map((e) => e.node.path)}`);

  return {
    ...pr.files.pageInfo,
    files: pr.files.edges.map((e) => e.node.path),
  };
}

/**
 * Gets a list of all the files modified in this commit
 *
 * @param client The Octokit instance
 * @param sha The SHA for the Commit
 * @param owner The Owner of the Repository
 * @param repo The Repository name (slug)
 *
 * @returns string[] An Array of the file paths modified in this commit, relative to the repository root
 */
export async function fetchFilesBatchCommit(
  client: Octokit,
  sha: string,
  owner: string,
  repo: string
): Promise<string[]> {
  try {
    core.debug(`Getting commit data for ${owner}/${repo}#${sha}`);
    const resp = await client.repos.getCommit({
      owner,
      repo,
      ref: sha,
    });

    const filesChanged = resp.data.files.map((f) => f.filename);

    core.info(`Files changed: ${filesChanged}`);

    return filesChanged;
  } catch (err) {
    core.error(err);
    core.setFailed("Error occurred getting files from commit.");
    return [];
  }
}
