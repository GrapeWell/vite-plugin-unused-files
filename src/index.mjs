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
      const dependencyGraph = new Map(); // 文件依赖图
      const allFilesSet = new Set(); // 项目中的所有文件

      // 替换别名为真实路径
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

      // 收集文件依赖
      const collectDependencies = async (filePath) => {
        const normalizedPath = normalizePath(filePath);

        if (dependencyGraph.has(normalizedPath)) return; // 防止重复解析
        dependencyGraph.set(normalizedPath, new Set()); // 初始化依赖集合

        // 读取文件内容
        let content;
        try {
          content = await fs.readFile(normalizedPath, "utf-8");
        } catch (err) {
          console.warn(`[Warning] Could not read file: ${normalizedPath}`);
          return;
        }

        // 正则匹配导入模式
        const importPatterns = [
          /import\s+["'](.*?)["'];?/g, // 普通 import
          /from\s+["'](.*?)["'];?/g, // from 语句
          /import\s*\(["'](.*?)["']\)/g, // 动态导入
          /lazy\s*\(\s*\(\s*\)\s*=>\s*import\(["'](.*?)["']\)\s*\)/g, // React.lazy 动态导入
          /url\(\s*['"]?(.*?)['"]?\s*\)/g, // CSS/LESS url() 语句
        ];

        for (const pattern of importPatterns) {
          for (const match of content.matchAll(pattern)) {
            const importPath = match[1];
            if (importPath) {
              let resolvedPath;

              if (importPath.startsWith(".")) {
                // 相对路径
                resolvedPath = normalizePath(
                  path.resolve(path.dirname(normalizedPath), importPath)
                );
                resolvedPath = await resolveFilePath(resolvedPath);
              } else if (importPath.startsWith("@/")) {
                // 别名路径
                resolvedPath = resolveAlias(importPath);
                resolvedPath = await resolveFilePath(resolvedPath);
              } else {
                // 忽略第三方依赖
                continue;
              }

              if (resolvedPath) {
                dependencyGraph.get(normalizedPath).add(resolvedPath); // 添加依赖关系
                await collectDependencies(resolvedPath); // 递归解析依赖
              } else {
                console.warn(
                  `[Warning] Could not resolve: ${importPath} in ${normalizedPath}`
                );
              }
            }
          }
        }
      };

      const resolveFilePath = async (filePath) => {
        // 检查是否存在扩展名
        if (path.extname(filePath)) {
          try {
            await fs.access(filePath);
            return normalizePath(filePath); // 确保路径标准化
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
          ".png",
          ".jpg",
          ".jpeg",
          ".gif",
          ".svg",
        ];
        for (const ext of extensions) {
          try {
            const candidate = filePath + ext;
            await fs.access(candidate);
            return normalizePath(candidate);
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
            return normalizePath(candidate);
          } catch {}
        }
        return null;
      };

      // 获取项目中所有文件
      const allFiles = await glob(include, { cwd: root, ignore: exclude });
      const absoluteAllFiles = allFiles.map((file) =>
        normalizePath(path.resolve(root, file))
      );
      absoluteAllFiles.forEach((file) => allFilesSet.add(file));

      // 解析所有文件依赖
      for (const file of absoluteAllFiles) {
        await collectDependencies(file);
      }

      // 找出未使用的文件
      const usedFiles = new Set(
        Array.from(dependencyGraph.values()).flatMap((deps) => [...deps])
      );
      const unusedFiles = Array.from(allFilesSet).filter(
        (file) => !usedFiles.has(file)
      );

      // 输出未使用的文件
      if (dryRun) {
        console.log(
          "[Dry Run] Unused files:",
          unusedFiles.filter((file) => !file.includes(entryFile))
        );
      } else {
        for (const file of unusedFiles) {
          await fs.unlink(file);
          console.log(`[Deleted] ${file}`);
        }
      }

      console.log("Unused files analysis complete.");
    },
  };
}

export { findUnusedFilesPlugin as default };
