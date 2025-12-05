# vite-plugin-unused-files

A Vite plugin to find and optionally remove unused files in your project.

## Features

- 🔍 **Deep Analysis**: Uses AST parsing (Babel, Vue Compiler, PostCSS) for accurate dependency detection.
- 🎯 **Broad Support**:
  - JavaScript/TypeScript (`.js`, `.ts`, `.jsx`, `.tsx`)
  - Vue Single File Components (`.vue`)
  - CSS/SCSS/Less (`.css`, `.scss`, `.less`)
  - Static assets (images, fonts, etc.)
- 🚀 **Advanced Detection**:
  - ES Modules (`import`/`export`)
  - CommonJS (`require`)
  - Dynamic imports (`import()`)
  - React.lazy & Vue async components
  - CSS `@import` and `url()`
  - JSX/Template asset references (`src`, `href`)
- 🛡️ **Safe**: Defaults to `dryRun: true` to prevent accidental deletion.

## Installation

```bash
npm install vite-plugin-unused-files --save-dev
# or
yarn add vite-plugin-unused-files -D
# or
pnpm add vite-plugin-unused-files -D
```

## Usage

```javascript
// vite.config.js
import findUnusedFiles from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFiles({
      // options
    }),
  ],
};
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `include` | `string[]` | `['src/**/*']` | Glob patterns for files to analyze. |
| `exclude` | `string[]` | `['src/**/*.d.ts']` | Glob patterns for files to ignore. |
| `alias` | `object` | `{ '@': 'src' }` | Path aliases mapping. |
| `root` | `string` | `process.cwd()` | Project root directory. |
| `dryRun` | `boolean` | `true` | If `true`, logs unused files without deleting them. |
| `failOnUnused` | `boolean` | `false` | If `true`, throws an error when unused files are found (useful for CI). |

```javascript
findUnusedFiles({
  include: ['src/**/*'],
  exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
  alias: { 
    '@': 'src',
    '~': 'src/assets'
  },
  dryRun: true, // Set to false to actually delete files
})
```

## How It Works

The plugin builds a complete dependency graph of your project:

1.  **Scan**: Finds all files matching your `include` patterns.
2.  **Parse**: Uses specialized parsers for each file type to extract imports:
    *   **JS/TS**: Uses `@babel/parser` to find `import`, `require`, and dynamic `import()`.
    *   **Vue**: Uses `@vue/compiler-sfc` to parse `<script>`, `<template>`, and `<style>`.
    *   **Styles**: Uses `postcss` to find `@import` and `url()` references.
3.  **Resolve**: Resolves all import paths to absolute file paths, handling aliases and extensions.
4.  **Compare**: Identifies files that exist in the scan but are never referenced in the dependency graph.

## Development

This project uses **Vitest** for unit testing.

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run manual integration test
node test/manual-test.mjs
```

## License

MIT
