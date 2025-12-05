import path from "path";
import fs from "fs/promises";
import {
  parseJsxContent,
  parseVueContent,
  parseStyleContent,
} from "./parser.mjs";
import { resolveFilePath } from "./resolver.mjs";

const getFileContent = async (filePath, cache) => {
  if (cache.has(filePath)) return cache.get(filePath);
  try {
    const content = await fs.readFile(filePath, "utf-8");
    cache.set(filePath, content);
    return content;
  } catch (err) {
    console.warn(`[Warning] Could not read file: ${filePath}`);
    return null;
  }
};

export const analyzeDependencies = async (filePath, context) => {
  const {
    dependencyGraph,
    fileContentCache,
    resolutionCache,
    alias,
    root,
    extensions,
  } = context;

  if (dependencyGraph.has(filePath)) return;

  // Mark as processing immediately to prevent cycles/re-entry
  dependencyGraph.set(filePath, new Set());

  const content = await getFileContent(filePath, fileContentCache);
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

    // Process imports in parallel
    await Promise.all(
      imports.map(async (importPath) => {
        const cacheKey = `${path.dirname(filePath)}:${importPath}`;
        let fullPath;

        if (resolutionCache && resolutionCache.has(cacheKey)) {
          fullPath = resolutionCache.get(cacheKey);
        } else {
          fullPath = await resolveFilePath(
            importPath,
            filePath,
            alias,
            root,
            extensions
          );
          if (resolutionCache) {
            resolutionCache.set(cacheKey, fullPath);
          }
        }

        if (fullPath) {
          dependencyGraph.get(filePath).add(fullPath);
          await analyzeDependencies(fullPath, context);
        }
      })
    );
  } catch (err) {
    console.warn(`[Warning] Error analyzing ${filePath}:`, err);
  }
};
