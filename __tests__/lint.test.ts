import path from "path";

import { ESLint } from "eslint";

import { lint } from "../src/lint";
import inputs from "../src/inputs";

jest.mock("@actions/core", () => ({
  debug: jest.fn(),
}));

jest.mock("eslint", () => ({
  ESLint: jest.fn(),
}));

jest.mock("../src/inputs", () => ({
  cwd: "./src",
  extensions: [".js"],
  ignore: ["node_modules"],
}));

beforeEach(() => {
  ((ESLint as unknown) as jest.Mock).mockClear();
  ((ESLint as unknown) as jest.Mock).mockImplementation(() => ({ lintFiles: jest.fn() }));
});

it("resolves cwd to absolute path", async () => {
  await lint([]);
  expect(ESLint).toHaveBeenCalledWith({
    cwd: path.resolve("./src"),
    extensions: [".js"],
    overrideConfig: {
      ignorePatterns: ["node_modules"],
    },
  });
});

it("falls back to process.cwd if option not provided", async () => {
  // @ts-ignore
  process.cwd = () => "/foo/bar";
  Object.defineProperty(inputs, "cwd", {
    get: () => undefined,
  });
  await lint([]);
  expect(ESLint).toHaveBeenCalledWith({
    cwd: "/foo/bar",
    extensions: [".js"],
    overrideConfig: {
      ignorePatterns: ["node_modules"],
    },
  });
});

it("lints files passed to it", async () => {
  const lintFiles = jest.fn().mockResolvedValue("lint result");
  const files = ["file1", "file2", "file3"];
  ((ESLint as unknown) as jest.Mock).mockImplementation(() => ({ lintFiles }));
  expect(await lint(files)).toEqual("lint result");
  expect(lintFiles).toHaveBeenCalledWith(files);
});
