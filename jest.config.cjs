module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__mocks__/styleMock.js',
  },
  testMatch: ['**/__tests__/**/*.test.ts?(x)'],
  transform: {
    '/src/mobile/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '/src/components/whatsapp/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    // src/utils lê `import.meta.env` (base do storefront). Sem o transform, o
    // arquivo inteiro fica intestável — foi o que manteve storefrontUrl.ts sem
    // teste até agora.
    '/src/utils/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    // src/components/maps lê a chave do Google via `import.meta.env`.
    '/src/components/maps/.+\\.(ts|tsx)$': '<rootDir>/jestViteEnvTransform.cjs',
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
