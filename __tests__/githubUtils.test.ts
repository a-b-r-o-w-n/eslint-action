/* eslint-disable @typescript-eslint/camelcase */
import * as github from "@actions/github";

import { getPrNumber, getSha } from "../src/githubUtils";

jest.mock("@actions/github", () => ({
  context: {
    payload: {},
    sha: "abcd1234",
  },
}));

describe("getPrNumber", () => {
  it("returns the pr number if a pull request", () => {
    github.context.payload.pull_request = {
      number: 123,
    };
    expect(getPrNumber()).toEqual(123);
  });

  it("returns undefined if not a pull request", () => {
    github.context.payload.pull_request = undefined;
    expect(getPrNumber()).toBeUndefined();
  });
});

describe("getSha", () => {
  it("returns the head sha if a pull request", () => {
    github.context.payload.pull_request = {
      number: 123,
      head: {
        sha: "prsha",
      },
    };
    expect(getSha()).toEqual("prsha");
  });

  it("returns the context sha if not a pull request", () => {
    github.context.payload.pull_request = undefined;
    expect(getSha()).toEqual("abcd1234");
  });
});
