const path = require("path");
const fs = require("fs/promises");
const { normalizePath } = require("vite");
const glob = require("fast-glob");

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
      const allFilesSet = new Set();
      const fileContentCache = new Map();
      const extensions = new Set(); // 动态生成扩展名集合
      const fileAlreadyDeleted = new Set();

      // 提取扩展名
      const extractExtensions = () => {
        include.forEach((pattern) => {
          const match = pattern.match(/\.\w+|\.\{\w+(,\w+)*\}/g);
          if (match) {
            match.forEach((ext) => {
              if (ext.startsWith(".{")) {
                // 处理 "{tsx,js}" 类型的模式
                ext
                  .replace(/[{}]/g, "")
                  .split(",")
                  .forEach((e) =>
                    extensions.add(e.startsWith(".") ? e : `.${e}`)
                  );
              } else {
                extensions.add(ext.startsWith(".") ? ext : `.${ext}`);
              }
            });
          }
        });
        if (extensions.size === 0) {
          [
            ".tsx",
            ".ts",
            ".jsx",
            ".js",
            ".css",
            ".scss",
            ".less",
            ".png",
            ".jpg",
            ".jpeg",
            ".gif",
            ".svg",
            ".vue",
          ].forEach((ext) => extensions.add(ext));
        }
        console.log(extensions);
      };

      // 动态提取扩展名
      extractExtensions();

      const getFileContent = async (filePath) => {
        if (fileContentCache.has(filePath))
          return fileContentCache.get(filePath);
        try {
          const content = await fs.readFile(filePath, "utf-8");
          fileContentCache.set(filePath, content);
          return content;
        } catch (err) {
          console.warn(`[Warning] Could not read file: ${filePath}`);
          return null;
        }
      };

      const resolveAlias = (importPath) => {
        for (const [key, value] of Object.entries(alias)) {
          if (importPath.startsWith(key)) {
            return normalizePath(
              path.resolve(root, importPath.replace(key, value))
            );
          }
        }
        return null;
      };

      const resolveFilePath = async (filePath) => {
        const ext = path.extname(filePath);
        if (extensions.has(ext)) {
          try {
            await fs.access(filePath);
            return normalizePath(filePath);
          } catch {
            return null;
          }
        }

        for (const ext of extensions) {
          const candidate = filePath + ext;
          try {
            await fs.access(candidate);
            return normalizePath(candidate);
          } catch {}
        }

        return await resolveIndexFile(filePath);
      };

      const resolveIndexFile = async (dirPath) => {
        for (const ext of extensions) {
          try {
            const candidate = path.join(dirPath, "index" + ext);
            await fs.access(candidate);
            return normalizePath(candidate);
          } catch {}
        }
        return null;
      };

      const collectDependencies = async (filePath) => {
        const normalizedPath = normalizePath(filePath);
        if (dependencyGraph.has(normalizedPath)) return;
        dependencyGraph.set(normalizedPath, new Set());
        const content = await getFileContent(normalizedPath);
        if (!content) return;

        const importPatterns = [
          /import\s+["'](.*?)["'];?/g,
          /from\s+["'](.*?)["'];?/g,
          /import\s*\(["'](.*?)["']\)/g,
          /lazy\s*\(\s*\(\s*\)\s*=>\s*import\(["'](.*?)["']\)\s*\)/g,
          /url\(\s*['"]?(.*?)['"]?\s*\)/g,
        ];

        for (const pattern of importPatterns) {
          for (const match of content.matchAll(pattern)) {
            const importPath = match[1];
            if (importPath) {
              let resolvedPath;
              if (importPath.startsWith(".")) {
                resolvedPath = normalizePath(
                  path.resolve(path.dirname(normalizedPath), importPath)
                );
                resolvedPath = await resolveFilePath(resolvedPath);
              } else if (importPath.startsWith("@/")) {
                resolvedPath = resolveAlias(importPath);
                resolvedPath = await resolveFilePath(resolvedPath);
              } else {
                continue;
              }
              if (resolvedPath) {
                dependencyGraph.get(normalizedPath).add(resolvedPath);
                await collectDependencies(resolvedPath);
              } else {
                fileAlreadyDeleted.add(
                  `[Warning] Could not resolve: ${importPath} in ${normalizedPath}`
                );
              }
            }
          }
        }
      };

      const allFiles = await glob(include, { cwd: root, ignore: exclude });
      const absoluteAllFiles = allFiles.map((file) =>
        normalizePath(path.resolve(root, file))
      );
      absoluteAllFiles.forEach((file) => allFilesSet.add(file));

      for (const file of absoluteAllFiles) {
        await collectDependencies(file);
      }

      const usedFiles = new Set(
        Array.from(dependencyGraph.values()).flatMap((deps) => [...deps])
      );
      const unusedFiles = Array.from(allFilesSet).filter(
        (file) => !usedFiles.has(file)
      );

      const uniqueUnusedFiles = [...new Set(unusedFiles)];

      if (dryRun) {
        console.log("[Dry Run] Unused files:", uniqueUnusedFiles);

        console.log(
          "The file has been deleted, but the reference has not been deleted"
        );
        console.log(Array.from(fileAlreadyDeleted));
      } else {
        for (const file of unusedFiles) {
          await fs.unlink(file);
          console.log(`[Deleted] ${file}`);
        }
      }

      if (failOnUnused && uniqueUnusedFiles.length > 0) {
        const errorMessage = `Found ${uniqueUnusedFiles.length} unused files`;
        throw new Error(errorMessage);
      }

      console.log("Unused files analysis complete.");
    },
  };
}

module.exports = findUnusedFilesPlugin;
