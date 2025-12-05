import path from "path";
import glob from "fast-glob";
import { normalizePath } from "vite";

export const priorityMap = {
  ".tsx": 1,
  ".jsx": 2,
  ".vue": 3,
  ".ts": 4,
  ".js": 5,
  ".less": 6,
  ".scss": 7,
  ".css": 8,
};

export const scanFiles = async ({ root, include, exclude }) => {
  const extensions = new Set();
  const allFilesSet = new Set();

  // 从文件路径中提取扩展名
  const extractExtension = (filePath) => {
    const ext = path.extname(filePath);
    if (ext) {
      extensions.add(ext.toLowerCase()); // 统一使用小写
    }
  };

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
  const sortedExtensions = new Set(
    Array.from(extensions).sort((a, b) => {
      const priorityA = priorityMap[a] || Infinity; // 未定义的扩展名放在最后
      const priorityB = priorityMap[b] || Infinity;
      return priorityA - priorityB;
    })
  );

  return {
    files,
    allFilesSet,
    extensions: sortedExtensions,
  };
};
