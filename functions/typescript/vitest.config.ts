/// <reference types="vitest" />

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    testTimeout: 10000,
    coverage: {
      provider: 'v8',
      statements: 100,
      branches: 100,
      functions: 100,
      lines: 100,
    },
    alias: {
      '@constants': './constants',
      '@commons/*': './commons/*',
      '@powertools': './powertools',
      '@middlewares/*': './middlewares/*',
      '@graphql/*': '../../frontend/src/graphql/*',
    },
    setupFiles: './tests/helpers/index.ts',
  },
});
