import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import ts from '@rollup/plugin-typescript'
import { terser } from 'rollup-plugin-terser'
import serve from 'rollup-plugin-serve'
import livereload from 'rollup-plugin-livereload'

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !global?.process?.env?.ROLLUP_WATCH

export default {
  input: 'src/index.tsx',
  output: {
    file: 'public/bundle.js',
    format: 'iife', // immediately-invoked function expression — suitable for <script> tags,
    name: 'r3dThreeJsApp',
    sourcemap: true
  },
  plugins: [
    resolve(), // tells Rollup how to find date-fns in node_modules
    commonjs(), // converts date-fns to ES modules
    ts(), // typescript
    serve('public'),
    livereload(),
    production && terser() // minify, but only in production
  ]
}
