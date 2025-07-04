import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/minimal.ts'],
  format: ['cjs'],
  target: 'node18',
  splitting: false,
  sourcemap: false,
  clean: true,
  bundle: true,
  noExternal: [/.*/],
  platform: 'node'
})
