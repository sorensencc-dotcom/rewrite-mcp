import { defineConfig } from 'vitest/config';


export default defineConfig({
  test: {
    include: [
      'mcp-servers/executive-intelligence-engine/src/**/*.test.js',
      'tests/**/*.{test,spec}.{js,ts}'
    ],
   exclude: [
  'tests/playwright/**',
  'src/**/worker.js',
  'src/**/ops/**',
  '**/*.integration.test.js',
  'node-tests/**'
]

  }
});
