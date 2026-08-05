import { defineConfig } from 'tsup'

export default defineConfig({
  tsconfig: 'tsconfig.build.json',
  entry: ['src/index.ts'],
  format: ['cjs'],
  treeshake: true,
  // The tsconfig uses the deprecated baseUrl option for path aliases,
  // which TypeScript 6 reports as an error during the dts build.
  dts: { compilerOptions: { ignoreDeprecations: '6.0' } },
  sourcemap: true,
  clean: true,
})
