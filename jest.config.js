/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  // The VS Code API is not available under Jest. Any module that imports
  // 'vscode' is mapped to a lightweight manual mock so pure-logic units can
  // be tested in isolation without the extension host.
  moduleNameMapper: {
    '^vscode$': '<rootDir>/src/test/mocks/vscode.ts',
  },
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        isolatedModules: true,
        tsconfig: {
          noUnusedLocals: false,
          noUnusedParameters: false,
        },
      },
    ],
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/test/**', '!src/**/*.d.ts'],
  clearMocks: true,
}
