import path from "path";
import fs from "fs/promises";
import { normalizePath } from "vite";
import { scanFiles } from "./core/scanner.mjs";
import { analyzeDependencies } from "./core/analyzer.mjs";

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
      console.log("Analyzing unused files...");
      const dependencyGraph = new Map();
      const fileContentCache = new Map();
      const resolutionCache = new Map();
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
        resolutionCache,
        alias,
        root,
        extensions,
      };

      // 并行分析所有文件，限制并发数
      const CONCURRENCY = 10;
      const chunks = [];
      for (let i = 0; i < absoluteAllFiles.length; i += CONCURRENCY) {
        chunks.push(absoluteAllFiles.slice(i, i + CONCURRENCY));
      }

      for (const chunk of chunks) {
        await Promise.all(
          chunk.map((file) => analyzeDependencies(file, context))
        );
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

export { findUnusedFilesPlugin as default };
