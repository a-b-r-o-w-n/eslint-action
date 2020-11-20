module.exports = {
  preset: "ts-jest",
  testPathIgnorePatterns: ["/node_modules/", "<rootDir>/__tests__/fixtures"],
  collectCoverageFrom: ["src/**/*.ts"],
};
