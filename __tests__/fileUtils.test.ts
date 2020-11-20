import fs from "fs";
import path from "path";

import * as core from "@actions/core";
import { Octokit } from "@octokit/rest";

import * as api from "../src/api";
import { filterFiles, getChangedFiles } from "../src/fileUtils";

jest.mock("fs");
jest.mock("path");
jest.mock("@actions/core", () => ({
  debug: jest.fn(),
  error: jest.fn(),
  setFailed: jest.fn(),
}));
jest.mock("@actions/github", () => ({
  context: {
    repo: {
      owner: "octocat",
      repo: "my-repo",
    },
  },
}));
jest.mock("../src/api");

describe("getChangedFiles", () => {
  const client = new Octokit({ auth: "some-token" });
  const filesGlob = ["**/*.js"];
  const sha = "123abc";

  describe("when change is a pull request", () => {
    it("fetches all changed files from PR", async () => {
      (api.fetchFilesBatchPR as jest.Mock)
        .mockResolvedValueOnce({
          files: ["first-file"],
          hasNextPage: true,
          endCursor: "cursor-1",
        })
        .mockResolvedValueOnce({
          files: ["last-file"],
          hasNextPage: false,
          endCursor: "cursor-2",
        });
      const prNumber = 123;

      await getChangedFiles(client, filesGlob, prNumber, sha);

      expect(api.fetchFilesBatchPR).toHaveBeenCalledTimes(2);
      expect(api.fetchFilesBatchPR).toHaveBeenCalledWith(client, prNumber, "octocat", "my-repo", undefined);
      expect(api.fetchFilesBatchPR).toHaveBeenCalledWith(client, prNumber, "octocat", "my-repo", "cursor-1");
    });

    it("fails if there is an error fetching files", async () => {
      (api.fetchFilesBatchPR as jest.Mock).mockRejectedValue("some error");

      const prNumber = 123;

      await getChangedFiles(client, filesGlob, prNumber, sha);
      expect(core.setFailed).toHaveBeenCalledWith("Error occurred getting changed files.");
    });
  });

  describe("when change is a commit", () => {
    beforeEach(() => {
      (api.fetchFilesBatchCommit as jest.Mock).mockResolvedValue([]);
    });

    it("fetches changed files for commit", async () => {
      await getChangedFiles(client, filesGlob, undefined, sha);
      expect(api.fetchFilesBatchCommit).toHaveBeenCalledWith(client, sha, "octocat", "my-repo");
    });
  });
});

describe("filterByGlob", () => {
  it("returns files that match any glob pattern", () => {
    (path.resolve as jest.Mock).mockImplementation((path) => path);
    (fs.existsSync as jest.Mock).mockImplementation(() => true);

    const globs = ["src/**/*", "test/**/*.js"];
    const files = ["src/foo/bar.ts", "src/foo/baz.js", "test/foo/bar.ts", "test/foo/baz.js", "config/env.json"];

    expect(filterFiles(files, globs)).toEqual(["src/foo/bar.ts", "src/foo/baz.js", "test/foo/baz.js"]);
  });

  it("filters deleted files", () => {
    (path.resolve as jest.Mock).mockImplementation((path) => path);
    (fs.existsSync as jest.Mock).mockImplementation((path) => !path.includes("deleted-file"));

    const globs = ["src/**/*", "test/**/*.js"];
    const files = ["src/foo/bar.ts", "src/foo/baz.js", "src/deleted-file.js"];

    expect(filterFiles(files, globs)).toEqual(["src/foo/bar.ts", "src/foo/baz.js"]);
  });
});
