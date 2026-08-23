/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\.spec\.ts$',
  transform: { '^.+\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: ['apps/**/*.(t|j)s', '!apps/**/main.ts', '!apps/**/*.module.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@app/contracts$': '<rootDir>/libs/contracts/src',
    '^@app/contracts/(.*)$': '<rootDir>/libs/contracts/src/$1',
  },
};
