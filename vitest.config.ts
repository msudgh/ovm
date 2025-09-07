import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 10000,
    coverage: {
      exclude: [
        'bin/**',
        'dist/**',
        'coverage/**',
        'vitest.config.ts',
        'eslint.config.cjs',
        'src/index.ts',
        '**/*.d.ts',
        '**/*.test.{ts,mts}',
        '**/*.types.{ts,mts}',
        'src/commands/**',
        'src/providers/registry.ts',
        'src/providers/registry-mock.ts',
        'src/providers/factory.ts',
        'src/utils/testing.ts',
        'src/utils/fixtures/**',
      ],
    },
    reporters: [
      [
        'junit',
        {
          suiteName: 'OVM Test Suite',
          classnameTemplate: 'filename:{filename} - filepath:{filepath}',
        },
      ],
      'verbose',
    ],
    outputFile: {
      junit: './junit.xml',
    },
  },
  esbuild: {
    target: 'node18',
  },
  define: {
    'process.env.NODE_ENV': '"test"',
  },
})
