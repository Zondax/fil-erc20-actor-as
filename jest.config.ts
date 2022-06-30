module.exports = {
  setupFiles: ["dotenv/config"],
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
  },
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  roots: ["<rootDir>/testing/rpc/"],
  globals: {
    "ts-jest": {
      tsconfig: `<rootDir>/testing/rpc/tsconfig.json`,
    },
  },
};
