# vite-plugin-unused-files

A Vite plugin to find and enumerate unused files in your project in terminal.

## Installation

```bash
npm install vite-plugin-unused-files
```

## Usage

```javascript
import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin({
      entryFile: "src/main.tsx",
      alias: { "@": "src" },
      include: ["src/**/*.{tsx,ts,jsx,js,css,scss,png,jpg,gif,svg}"],
      exclude: ["src/**/*.d.ts"],
      dryRun: true,
    }),
  ],
};
```

## Info

- This plugin scans your project for files that are not imported or required by any other file.
- The default entry file is main.tsx, you can customize this by passing the `entryFile` option in the plugin configuration.
