/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "jsdom",
  testMatch: ["**/__tests__/**/*.test.(ts|tsx)"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1"
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      { tsconfig: { jsx: "react" } }
    ]
  },
  // Transpile ESM-only packages in node_modules that Jest otherwise can't parse
  transformIgnorePatterns: [
    "/node_modules/(?!(openai|@openai|@radix-ui|class-variance-authority)/)"
  ]
};

