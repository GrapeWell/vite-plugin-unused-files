import path from "path";
import fs from "fs/promises";
import { normalizePath } from "vite";
import glob from "fast-glob";

function findUnusedFilesPlugin({
  include = ["src/**/*.{tsx,ts,jsx,js,css,scss,less,png,jpg,gif,svg}"],
  exclude = ["src/**/*.d.ts"],
  entryFile = "src/main.tsx", // 默认入口文件
  alias = { "@": "src" }, // 别名配置
  root = process.cwd(),
  dryRun = true,
} = {}) {
  return {
    name: "vite-plugin-find-unused-files",
    async closeBundle() {
      console.log("Analyzing unused files...");
      const usedFiles = new Set();

      // 1. 替换别名为真实路径
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

      // 2. 解析文件依赖
      const collectDependencies = async (filePath, depth = 0) => {
        const normalizedPath = normalizePath(filePath);
        if (usedFiles.has(normalizedPath)) return; // 防止重复解析
        usedFiles.add(normalizedPath);

        // 读取文件内容
        let content;
        try {
          content = await fs.readFile(normalizedPath, "utf-8");
        } catch (err) {
          console.warn(`Could not read file: ${normalizedPath}`);
          return;
        }

        // 解析 import 语句
        const importRegex = /import\s+["'](.*?)["'];?|from\s+["'](.*?)["'];?/g;
        for (const match of content.matchAll(importRegex)) {
          const importPath = match[1] || match[2];
          if (importPath) {
            let resolvedPath;

            if (importPath.startsWith(".")) {
              // 处理相对路径
              resolvedPath = normalizePath(
                path.resolve(path.dirname(normalizedPath), importPath)
              );
              resolvedPath = await resolveFilePath(resolvedPath);
            } else if (importPath.startsWith("@/")) {
              // 处理别名路径
              resolvedPath = resolveAlias(importPath);
              resolvedPath = await resolveFilePath(resolvedPath);
            } else {
              // 忽略第三方依赖
              continue;
            }

            if (resolvedPath) {
              await collectDependencies(resolvedPath, depth + 1);
            }
          }
        }
      };

      const resolveFilePath = async (filePath) => {
        // 检查是否存在扩展名
        if (path.extname(filePath)) {
          try {
            await fs.access(filePath);
            return filePath;
          } catch {
            return null;
          }
        }

        // 尝试补全扩展名
        const extensions = [
          ".js",
          ".jsx",
          ".ts",
          ".tsx",
          ".css",
          ".scss",
          ".less",
        ];
        for (const ext of extensions) {
          try {
            const candidate = filePath + ext;
            await fs.access(candidate);
            return candidate;
          } catch {}
        }

        // 尝试解析 index 文件
        return await resolveIndexFile(filePath);
      };

      const resolveIndexFile = async (dirPath) => {
        const extensions = [".js", ".jsx", ".ts", ".tsx"];
        for (const ext of extensions) {
          try {
            const candidate = path.join(dirPath, "index" + ext);
            await fs.access(candidate);
            return candidate;
          } catch {}
        }
        return null;
      };

      // 解析入口文件及其依赖
      const entryFilePath = normalizePath(path.resolve(root, entryFile));
      console.log(`Parsing entry file: ${entryFilePath}`);
      await collectDependencies(entryFilePath);

      // 3. 获取项目中所有匹配的文件
      const allFiles = await glob(include, { cwd: root, ignore: exclude });
      const absoluteAllFiles = allFiles.map((file) =>
        normalizePath(path.resolve(root, file))
      );

      // 4. 找出未使用的文件
      const unusedFiles = absoluteAllFiles.filter(
        (file) => !usedFiles.has(file)
      );

      if (dryRun) {
        console.log("Unused files (dry run):", unusedFiles);
      } else {
        for (const file of unusedFiles) {
          await fs.unlink(file);
          console.log(`Deleted: ${file}`);
        }
      }

      console.log("Unused files analysis complete.");
    },
  };
}

export default findUnusedFilesPlugin;
