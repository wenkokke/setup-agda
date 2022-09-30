module.exports = {
  clearMocks: true,
  moduleFileExtensions: ['js', 'ts'],
  testMatch: ['**/*.test.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/vendor/'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  verbose: true
}
