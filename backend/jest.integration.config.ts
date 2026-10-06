import type { Config } from "jest";

const integrationConfig: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src/tests/integration"],
  testMatch: ["**/*.integration.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/src/tests/test/setup.ts"],
  clearMocks: true,
  restoreMocks: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "src/conversations/**/*.ts",
    "src/repositories/**/*.ts",
    "!src/tests/**",
  ],
  coverageDirectory: "coverage/integration",
  coverageReporters: ["html", "lcov", "text-summary"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { tsconfig: "<rootDir>/tsconfig.test.json" }],
  },
  moduleFileExtensions: ["ts", "js", "json"],
};

export default integrationConfig;
