# vite-plugin-unused-files

A Vite plugin to find and optionally remove unused files in your project.

## Features

- 🔍 Detects unused files in your project
- 🎯 Supports multiple file types:
  - JavaScript/TypeScript
  - Vue Single File Components
  - CSS/SCSS/Less
  - Static assets (images, fonts, etc.)
- 🚀 Advanced dependency analysis:
  - React.lazy dynamic imports
  - Vue dynamic imports
  - CSS/SCSS/Less url() references
  - JSX/TSX imports
- 🎨 Customizable configuration

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
import findUnusedFiles from 'vite-plugin-unused-files'

export default {
  plugins: [
    findUnusedFiles({
      // options
    })
  ]
}
```

## Configuration

```javascript
{
  // Files to include in the analysis (glob patterns)
  include: ['src/**/*'],
  
  // Files to exclude from analysis
  exclude: ['src/**/*.d.ts'],
  
  // Path aliases configuration
  alias: { '@': 'src' },
  
  // Project root directory
  root: process.cwd(),
  
  // Run in dry mode (no files will be deleted)
  dryRun: true,
  
  // Fail build if unused files are found
  failOnUnused: false
}
```

## How It Works

The plugin analyzes your project's dependency graph by:

1. Scanning all files in your project (based on include/exclude patterns)
2. Parsing different file types to extract dependencies:
   - JavaScript/TypeScript imports (static and dynamic)
   - React.lazy dynamic imports
   - Vue SFC dependencies (script, template, and style blocks)
   - CSS/SCSS/Less imports and url() references
3. Building a dependency graph
4. Identifying files that aren't referenced in the dependency graph

## Examples

### Basic Usage

```javascript
// vite.config.js
import findUnusedFiles from 'vite-plugin-unused-files'

export default {
  plugins: [
    findUnusedFiles({
      include: ['src/**/*'],
      exclude: ['src/**/*.d.ts'],
      dryRun: true
    })
  ]
}
```

### Production Build with File Deletion

```javascript
// vite.config.js
import findUnusedFiles from 'vite-plugin-unused-files'

export default {
  plugins: [
    findUnusedFiles({
      include: ['src/**/*'],
      exclude: ['src/**/*.d.ts', 'src/**/*.test.*'],
      dryRun: process.env.NODE_ENV !== 'production',
      failOnUnused: true
    })
  ]
}
```

## Notes

- Always run with `dryRun: true` first to review the list of unused files
- The plugin detects files that are not imported anywhere in your codebase
- External URLs and data URLs are automatically filtered out
- Use `failOnUnused: true` in CI/CD pipelines to catch unused files early
- The analysis results are for reference only, please review carefully before deleting any files

## License

MIT
