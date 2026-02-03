/** @type {import('jest').Config} */
const nextJest = require("next/jest");

const createJestConfig = nextJest({ dir: "." });

const config = {
  testEnvironment: "jsdom",
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  collectCoverageFrom: ["src/lib/**/*.ts", "src/lib/**/*.tsx", "!**/*.d.ts", "!**/__tests__/**"],
};

module.exports = createJestConfig(config);
