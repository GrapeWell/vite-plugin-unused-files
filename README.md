# vite-plugin-unused-files

A Vite plugin for finding and listing unused files in your project.

## Installation

```bash
npm install vite-plugin-unused-files
```

## Usage

### Default Options

```javascript
{
  include: ["src/**/*"],
  exclude: ["src/**/*.d.ts"],
  alias: { "@": "src" },
  root: process.cwd(),
  dryRun: true,
  failOnUnused: false,
}

import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin(),
  ],
};
```

### Custom Options

```javascript
import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin({
      alias: { "@": "src" },
      include: ["src/**/*.{tsx,ts,jsx,js,css,scss,less,png,jpg,gif,svg}"],
      exclude: ["src/**/*.d.ts"],
      dryRun: true,
      failOnUnused: true,
    }),
  ],
};
```

### Options Explanation

- `include`: Directories to include.
- `exclude`: Directories and files to exclude.
- `alias`: Alias configuration.
- `dryRun`: Whether to delete files. `false` will automatically delete files.
- `failOnUnused`: Whether to throw an error. `true` will throw an error and interrupt the build process.

## Information

- Supported import formats:

  ```javascript
  import "./style.css"; // Static import of style files
  import { something } from "./module"; // Import specific content from a module
  import("./dynamic-module"); // Dynamic import of a module
  lazy(() => import("./lazy-module")); // Lazy loading module
  ```

- Use Cases:

  - Suitable for cleaning up unused files in your project.
  - Supports custom entry files, aliases, and inclusion/exclusion of file types.
  - It is recommended to specify the file suffix in `include` for a better experience

- Notes:

  - The final results are for reference only. It is recommended to back up your files before deleting them.

- Report issues on GitHub.
