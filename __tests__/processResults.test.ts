import inputs from "../src/inputs";
import { CHECK_NAME, processResults } from "../src/processResults";

jest.mock("@actions/core", () => ({
  debug: jest.fn(),
}));

jest.mock("../src/inputs", () => ({
  quiet: false,
}));

const errorMsg = {
  line: 10,
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

it("returns check endpoint payload with correct annotations", () => {
  // @ts-expect-error
  const payload = processResults(mockResults);

  expect(payload).toMatchObject({
    conclusion: "failure",
    output: {
      title: CHECK_NAME,
      summary: "3 error(s) found",
      annotations: expect.any(Array),
    },
  });

  const annotations = payload.output?.annotations;
  expect(annotations).toHaveLength(4);
});

it("passes the check if there are no errors", () => {
  const payload = processResults([
    {
      filePath: "/bar",
      // @ts-expect-error
      messages: [warnMsg, invalidMsg],
    },
  ]);

  expect(payload.conclusion).toEqual("success");
});

it("does not include warnings if quiet option is true", () => {
  Object.defineProperty(inputs, "quiet", {
    get: () => true,
  });
  // @ts-expect-error
  const payload = processResults(mockResults);
  expect(payload.output?.annotations).toHaveLength(3);
  expect(payload.output?.annotations?.some((a) => a.annotation_level === "warning")).toBe(false);
});
