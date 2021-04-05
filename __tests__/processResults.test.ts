import * as core from "@actions/core";

import inputs from "../src/inputs";
import { processResults } from "../src/processResults";

jest.mock("@actions/core", () => ({
  debug: jest.fn(),
  warning: jest.fn(),
  error: jest.fn(),
  startGroup: jest.fn(),
  endGroup: jest.fn(),
  isDebug: () => true,
}));

jest.mock("../src/inputs", () => ({
  quiet: false,
}));

const errorMsg = {
  line: 10,
  column: 5,
  severity: 2,
  ruleId: "no-var",
  message: "no var allowed",
};

const warnMsg = {
  line: 5,
  severity: 1,
  ruleId: "no-console",
  message: "no console allowed",
};

const invalidMsg = {
  line: 1,
  severity: 2,
  ruleId: undefined,
  message: "bad rule",
};

const mockResults = [
  {
    filePath: "/foo",
    messages: [errorMsg, warnMsg, { ...errorMsg, line: 20 }],
  },
  {
    filePath: "/bar",
    messages: [errorMsg, invalidMsg],
  },
];

beforeEach(() => {
  (core.startGroup as jest.Mock).mockClear();
  (core.endGroup as jest.Mock).mockClear();
  (core.warning as jest.Mock).mockClear();
  (core.error as jest.Mock).mockClear();
});

it("should return the number of errors", () => {
  // @ts-ignore
  expect(processResults(mockResults)).toEqual(3);
});

it("start and end a group based on file", () => {
  // @ts-ignore
  processResults(mockResults);

  expect(core.startGroup).toHaveBeenCalledTimes(2);
  expect(core.startGroup).toHaveBeenCalledWith("/foo");
  expect(core.startGroup).toHaveBeenCalledWith("/bar");
});

it("should log each lint message", () => {
  // @ts-ignore
  processResults(mockResults);

  expect(core.warning).toHaveBeenCalledTimes(1);
  expect(core.warning).toHaveBeenCalledWith("file=/foo,line=5::[no-console] no console allowed");

  expect(core.error).toHaveBeenCalledTimes(3);
  expect(core.error).toHaveBeenCalledWith("file=/foo,line=10,col=5::[no-var] no var allowed");
  expect(core.error).toHaveBeenCalledWith("file=/foo,line=20,col=5::[no-var] no var allowed");
  expect(core.error).toHaveBeenCalledWith("file=/bar,line=10,col=5::[no-var] no var allowed");
});

it("should skip warnings if quiet option is set", () => {
  Object.defineProperty(inputs, "quiet", {
    get: () => true,
  });

  // @ts-ignore
  processResults(mockResults);

  expect(core.warning).not.toHaveBeenCalled();
});
