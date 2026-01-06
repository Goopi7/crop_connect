module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'routes/**/*.js',
    'models/**/*.js',
    'middleware/**/*.js',
    '!node_modules/**',
    '!coverage/**'
  ],
  testMatch: [
    '**/test/**/*.test.js'
  ],
  setupFilesAfterEnv: ['<rootDir>/test/setup.js'],
  testTimeout: 30000,
  verbose: true,
  forceExit: true,
  detectOpenHandles: true
};