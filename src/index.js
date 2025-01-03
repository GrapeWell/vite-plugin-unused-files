const path = require("path");
const fs = require("fs/promises");
const { normalizePath } = require("vite");
const glob = require("fast-glob");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse");
const { parse: vueParser } = require("@vue/compiler-sfc");
const postcss = require("postcss");
const postcssLess = require("postcss-less");
const postcssScss = require("postcss-scss");

const priorityMap = {
  ".tsx": 1,
  ".jsx": 2,
  ".vue": 3,
  ".ts": 4,
  ".js": 5,
  ".less": 6,
  ".scss": 7,
  ".css": 8,
};

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
      let extensions = new Set(); // 动态生成扩展名集合
      const fileAlreadyDeleted = new Set();

      // 从文件路径中提取扩展名
      const extractExtension = (filePath) => {
        const ext = path.extname(filePath);
        if (ext) {
          extensions.add(ext.toLowerCase()); // 统一使用小写
        }
      };

      // 扫描文件并提取扩展名
      const scanFiles = async () => {
        const files = await glob(include, {
          cwd: root,
          ignore: exclude,
        });

        // 收集所有文件并提取扩展名
        files.forEach((file) => {
          const absolutePath = normalizePath(path.resolve(root, file));
          allFilesSet.add(absolutePath);
          extractExtension(file);
        });

        // 扩展名排序
        extensions = new Set(
          Array.from(extensions).sort((a, b) => {
            const priorityA = priorityMap[a] || Infinity; // 未定义的扩展名放在最后
            const priorityB = priorityMap[b] || Infinity;
            return priorityA - priorityB;
          })
        );

        return files;
      };

      // 扫描文件并初始化
      const allFiles = await scanFiles();
      const absoluteAllFiles = allFiles.map((file) =>
        normalizePath(path.resolve(root, file))
      );

      if (extensions.size === 0) {
        console.warn("[Warning] No files found matching the include patterns");
        return;
      }

      const parseJsxContent = (content) => {
        const ast = parser.parse(content, {
          sourceType: "module",
          plugins: ["jsx", "typescript"],
        });
        const imports = [];

        traverse.default(ast, {
          ImportDeclaration(path) {
            imports.push(path.node.source.value);
          },
          CallExpression(path) {
            if (
              path.node.callee.type === "Import" ||
              (path.node.callee.name === "require" &&
                path.node.arguments[0]?.value)
            ) {
              imports.push(path.node.arguments[0].value);
            }
          },
          VariableDeclarator(path) {
            // 处理 React.lazy 动态导入
            if (
              path.node.init?.type === "CallExpression" &&
              path.node.init.callee.type === "MemberExpression" &&
              path.node.init.callee.object.name === "React" &&
              path.node.init.callee.property.name === "lazy"
            ) {
              const argument = path.node.init.arguments[0];
              if (
                argument.type === "ArrowFunctionExpression" ||
                argument.type === "FunctionExpression"
              ) {
                const returnStatement = argument.body;
                if (
                  returnStatement.type === "CallExpression" &&
                  returnStatement.callee.type === "Import"
                ) {
                  imports.push(returnStatement.arguments[0].value);
                }
              }
            }
          },
          JSXAttribute(path) {
            // 处理 JSX 中的资源引用
            if (
              (path.node.name.name === "src" ||
                path.node.name.name === "href") &&
              path.node.value?.value
            ) {
              const value = path.node.value.value;
              if (
                !value.startsWith("data:") &&
                !value.startsWith("http://") &&
                !value.startsWith("https://") &&
                !value.startsWith("//")
              ) {
                imports.push(value);
              }
            }
          },
        });

        return imports;
      };

      const parseVueContent = async (content) => {
        const imports = [];
        const { descriptor } = vueParser(content);

        // Parse script content
        if (descriptor.script || descriptor.scriptSetup) {
          const scriptContent = (descriptor.script || descriptor.scriptSetup)
            .content;
          imports.push(...parseJsxContent(scriptContent));
        }

        // Parse template for asset references
        if (descriptor.template) {
          const template = descriptor.template.content;
          // 匹配静态资源引用
          const srcRegex = /\b(?:src|href|url|asset)=["']([^"']+)["']/g;
          let match;
          while ((match = srcRegex.exec(template)) !== null) {
            imports.push(match[1]);
          }

          // 匹配动态资源引用
          const dynamicSrcRegex =
            /:[sS]rc=["']([^"']+)["']|v-bind:src=["']([^"']+)["']|@src=["']([^"']+)["']/g;
          while ((match = dynamicSrcRegex.exec(template)) !== null) {
            const value = match[1] || match[2] || match[3];
            if (value && !value.startsWith("{") && !value.includes("${")) {
              imports.push(value);
            }
          }

          // 匹配动态导入
          const importRegex = /import\s*\(\s*["']([^"']+)["']\s*\)/g;
          while ((match = importRegex.exec(template)) !== null) {
            imports.push(match[1]);
          }
        }

        // Parse style blocks
        if (descriptor.styles) {
          for (const style of descriptor.styles) {
            if (style.lang === "less" || style.lang === "scss") {
              const processor =
                style.lang === "less" ? postcssLess : postcssScss;
              const result = await postcss().process(style.content, {
                parser: processor,
              });
              // 提取 @import
              result.root.walkAtRules("import", (rule) => {
                imports.push(rule.params.replace(/['"]/g, ""));
              });
              // 提取 url()
              result.root.walkDecls((decl) => {
                const urlRegex = /url\(['"]?([^'"()]+)['"]?\)/g;
                let match;
                while ((match = urlRegex.exec(decl.value)) !== null) {
                  imports.push(match[1]);
                }
              });
            }
          }
        }

        // 过滤掉数据 URL 和外部 URL
        return imports.filter(
          (imp) =>
            !imp.startsWith("data:") &&
            !imp.startsWith("http://") &&
            !imp.startsWith("https://") &&
            !imp.startsWith("//")
        );
      };

      const parseStyleContent = async (content, ext) => {
        const imports = [];
        try {
          const processor = ext === ".less" ? postcssLess : postcssScss;
          const result = await postcss().process(content, {
            parser: processor,
          });

          // 处理 @import 语句
          result.root.walkAtRules("import", (rule) => {
            const importPath = rule.params.replace(/['"]/g, "");
            imports.push(importPath);
          });

          // 处理 url() 引用
          result.root.walkDecls((decl) => {
            const urlMatches =
              decl.value?.match(/url\(['"]?([^'"()]+)['"]?\)/g) || [];
            for (const match of urlMatches) {
              const url = match.replace(/url\(['"]?([^'"()]+)['"]?\)/, "$1");
              if (
                !url.startsWith("data:") &&
                !url.startsWith("http://") &&
                !url.startsWith("https://") &&
                !url.startsWith("//")
              ) {
                imports.push(url);
              }
            }
          });
        } catch (error) {
          console.warn(`Error parsing style content: ${error.message}`);
        }

        return imports;
      };

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

      const resolveImportPath = (importPath, currentFile) => {
        // Handle alias paths first
        const aliasPath = resolveAlias(importPath);
        if (aliasPath) {
          return aliasPath;
        }

        // Handle absolute paths
        if (path.isAbsolute(importPath)) {
          return normalizePath(importPath);
        }

        // Handle relative paths
        if (importPath.startsWith(".")) {
          return normalizePath(
            path.resolve(path.dirname(currentFile), importPath)
          );
        }

        // Handle node_modules or other paths
        return normalizePath(path.resolve(root, importPath));
      };

      const resolveFilePath = async (importPath, currentFile) => {
        const resolvedPath = resolveImportPath(importPath, currentFile);
        const ext = path.extname(resolvedPath);

        // First try the exact path
        if (ext && extensions.has(ext)) {
          try {
            await fs.access(resolvedPath);
            return resolvedPath;
          } catch {}
        }

        // Try with different extensions if no extension or file not found
        const basePathsToTry = [resolvedPath];

        // If the path doesn't end with 'index', also try with /index
        if (!resolvedPath.endsWith("index")) {
          basePathsToTry.push(path.join(resolvedPath, "index"));
        }

        // Try all possible combinations of base paths and extensions
        for (const basePath of basePathsToTry) {
          // If the base path has an extension, try it first
          if (
            path.extname(basePath) &&
            extensions.has(path.extname(basePath))
          ) {
            try {
              await fs.access(basePath);
              return normalizePath(basePath);
            } catch {}
          }

          // Try with all possible extensions
          for (const ext of extensions) {
            const fullPath = `${basePath}${ext}`;
            try {
              await fs.access(fullPath);
              return normalizePath(fullPath);
            } catch {}
          }
        }

        // If the path might be a directory, try to find an index file
        try {
          const stats = await fs.stat(resolvedPath);
          if (stats.isDirectory()) {
            for (const ext of extensions) {
              const indexPath = path.join(resolvedPath, `index${ext}`);
              try {
                await fs.access(indexPath);
                return normalizePath(indexPath);
              } catch {}
            }
          }
        } catch {}

        return null;
      };

      const analyzeDependencies = async (filePath) => {
        if (dependencyGraph.has(filePath)) return;

        const content = await getFileContent(filePath);
        if (!content) return;

        const ext = path.extname(filePath);
        let imports = [];

        try {
          if (ext === ".vue") {
            imports = await parseVueContent(content);
          } else if ([".jsx", ".tsx", ".js", ".ts"].includes(ext)) {
            imports = parseJsxContent(content);
          } else if ([".less", ".scss"].includes(ext)) {
            imports = await parseStyleContent(content, ext);
          }

          dependencyGraph.set(filePath, new Set());

          for (const importPath of imports) {
            const fullPath = await resolveFilePath(importPath, filePath);
            if (fullPath) {
              dependencyGraph.get(filePath).add(fullPath);
              await analyzeDependencies(fullPath);
            }
          }
        } catch (err) {
          console.warn(`[Warning] Error analyzing ${filePath}:`, err);
        }
      };

      // 先分析所有文件
      for (const file of absoluteAllFiles) {
        await analyzeDependencies(file);
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
