module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transform: {
    '/src/mobile/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
