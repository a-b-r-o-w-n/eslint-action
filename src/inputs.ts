import * as core from "@actions/core";

const processArrayInput = (key: string, required = false): string[] => {
  return core
    .getInput(key, { required })
    .split(",")
    .map((e) => e.trim());
};

const processBooleanInput = (key: string): boolean => {
  const value = core.getInput(key).toLowerCase();

  return value === "true";
};

const inputs = {
  /* istanbul ignore next */
  get token() {
    return core.getInput("repo-token", { required: true });
  },

  get extensions() {
    return processArrayInput("extensions", true);
  },

  get ignore() {
    return processArrayInput("ignore");
  },

  get files() {
    return processArrayInput("files");
  },

  /* istanbul ignore next */
  get cwd() {
    return core.getInput("working-directory");
  },

  get quiet() {
    return processBooleanInput("quiet");
  },
};

export default inputs;
