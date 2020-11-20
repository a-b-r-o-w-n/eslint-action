import * as core from "@actions/core";

import inputs from "../src/inputs";

jest.mock("@actions/core", () => ({
  getInput: jest.fn(),
}));

describe("extensions", () => {
  it("converts to array", () => {
    ((core.getInput as unknown) as jest.Mock).mockReturnValue(".js,.ts, .tsx");

    expect(inputs.extensions).toEqual([".js", ".ts", ".tsx"]);
    expect(core.getInput).toHaveBeenCalledWith("extensions", { required: true });
  });
});

describe("ignore", () => {
  it("converts to array", () => {
    ((core.getInput as unknown) as jest.Mock).mockReturnValue("**/node_modules/**,coverage/**");

    expect(inputs.ignore).toEqual(["**/node_modules/**", "coverage/**"]);
    expect(core.getInput).toHaveBeenCalledWith("ignore", { required: false });
  });
});

describe("files", () => {
  it("converts to array", () => {
    ((core.getInput as unknown) as jest.Mock).mockReturnValue("src/**/*, other/**/*");

    expect(inputs.files).toEqual(["src/**/*", "other/**/*"]);
    expect(core.getInput).toHaveBeenCalledWith("files", { required: false });
  });
});
