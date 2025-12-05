import path from "path";
import fs from "fs/promises";
import { normalizePath } from "vite";

export const resolveAlias = (importPath, alias, root) => {
  for (const [key, value] of Object.entries(alias)) {
    if (importPath.startsWith(key)) {
      return normalizePath(path.resolve(root, importPath.replace(key, value)));
    }
  }
  return null;
};

export const resolveImportPath = (importPath, currentFile, alias, root) => {
  // Handle alias paths first
  const aliasPath = resolveAlias(importPath, alias, root);
  if (aliasPath) {
    return aliasPath;
  }

  // Handle absolute paths
  if (path.isAbsolute(importPath)) {
    return normalizePath(importPath);
  }

  // Handle relative paths
  if (importPath.startsWith(".")) {
    return normalizePath(path.resolve(path.dirname(currentFile), importPath));
  }

  // Handle node_modules or other paths
  return normalizePath(path.resolve(root, importPath));
};

export const resolveFilePath = async (
  importPath,
  currentFile,
  alias,
  root,
  extensions
) => {
  const resolvedPath = resolveImportPath(importPath, currentFile, alias, root);
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
    if (path.extname(basePath) && extensions.has(path.extname(basePath))) {
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
