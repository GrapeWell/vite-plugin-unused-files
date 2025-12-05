const path = require("path");
const fs = require("fs/promises");
const { normalizePath } = require("vite");

function findUnusedFilesPlugin({
  include = ["src/**/*"],
  exclude = ["src/**/*.d.ts"],
  alias = { "@": "src" },
  root = process.cwd(),
  dryRun = true,
  failOnUnused = false,
} = {}) {
  return {
    name: "vite-plugin-find-unused-files",
    async buildStart() {
      // Dynamic import for ESM modules
      const { scanFiles } = await import("./core/scanner.mjs");
      const { analyzeDependencies } = await import("./core/analyzer.mjs");

      console.log("Analyzing unused files...");
      const dependencyGraph = new Map();
      const fileContentCache = new Map();
      const fileAlreadyDeleted = new Set();

      // 扫描文件并初始化
      const {
        files: allFiles,
        allFilesSet,
        extensions,
      } = await scanFiles({
        root,
        include,
        exclude,
      });

      const absoluteAllFiles = allFiles.map((file) =>
        normalizePath(path.resolve(root, file))
      );

      if (extensions.size === 0) {
        console.warn("[Warning] No files found matching the include patterns");
        return;
      }

      const context = {
        dependencyGraph,
        fileContentCache,
        alias,
        root,
        extensions,
      };

      // 先分析所有文件
      for (const file of absoluteAllFiles) {
        await analyzeDependencies(file, context);
      }

      // 收集使用的文件
      const usedFiles = new Set(
        Array.from(dependencyGraph.values()).flatMap((deps) => [...deps])
      );

      const unusedFiles = Array.from(allFilesSet).filter(
        (file) => !usedFiles.has(file)
      );

      const uniqueUnusedFiles = [...new Set(unusedFiles)];

      if (dryRun) {
        console.log(
          "\n[Dry Run] Found",
          uniqueUnusedFiles.length,
          "unused files:"
        );
        uniqueUnusedFiles.forEach((file) => {
          console.log(`- ${file}`);
        });

        if (fileAlreadyDeleted.size > 0) {
          console.log("\nWarnings - Files referenced but not found:");
          Array.from(fileAlreadyDeleted).forEach((warning) => {
            console.log(`- ${warning}`);
          });
        }
      } else {
        console.log("\nDeleting unused files:");
        for (const file of unusedFiles) {
          await fs.unlink(file);
          console.log(`- Deleted: ${file}`);
        }
      }

      if (failOnUnused && uniqueUnusedFiles.length > 0) {
        const errorMessage = `Found ${uniqueUnusedFiles.length} unused files`;
        throw new Error(errorMessage);
      }

      console.log("\nUnused files analysis complete.");
    },
  };
}

module.exports = findUnusedFilesPlugin;
