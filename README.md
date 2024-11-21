# vite-plugin-unused-files

一个用于在终端中查找和列举项目中未使用文件的 Vite 插件。

[English Version](#vite-plugin-unused-files-english)

## 安装

```bash
npm install vite-plugin-unused-files
```

## 使用方法

### 默认选项

```javascript
{
  include = ["src/**/*.{tsx,ts,jsx,js,css,scss,less,png,jpg,gif,svg}"],
  exclude = ["src/**/*.d.ts"],
  entryFile = "src/main.tsx",
  alias = { "@": "src" },
  root = process.cwd(),
  dryRun = true,
}

import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin(),
  ],
};
```

### 自定义选项

```javascript
import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin({
      entryFile: "src/main.jsx",
      alias: { "@": "src" },
      include: ["src/**/*.{tsx,ts,jsx,js,css,scss,png,jpg,gif,svg}"],
      exclude: ["src/**/*.d.ts"],
      dryRun: true,
    }),
  ],
};
```

## 信息

- 支持识别的导入格式包括：

  ```javascript
  import "./style.css"; // 静态导入样式文件
  import { something } from "./module"; // 从模块中导入特定内容
  import("./dynamic-module"); // 动态导入模块
  lazy(() => import("./lazy-module")); // 懒加载模块
  ```

- 使用场景：

  - 适用于需要清理项目中未使用文件的场景。
  - 可以通过设置`dryRun`为`false`来自动删除未使用的文件，或设置为`true`仅打印未使用文件的信息。
  - 支持自定义入口文件、别名、包含和排除的文件类型。

- 注意事项：
  - 最终结果仅供参考，建议在删除文件前进行备份。
  - 插件的效果依赖于项目的结构和导入方式，可能需要根据具体项目进行调整。

---

# vite-plugin-unused-files (English)

A Vite plugin to find and enumerate unused files in your project in terminal.

[中文版](#vite-plugin-unused-files)

## Installation

```bash
npm install vite-plugin-unused-files
```

## Usage

### Default Options

```javascript
{
  include = ["src/**/*.{tsx,ts,jsx,js,css,scss,less,png,jpg,gif,svg}"],
  exclude = ["src/**/*.d.ts"],
  entryFile = "src/main.tsx",
  alias = { "@": "src" },
  root = process.cwd(),
  dryRun = true,
}

import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin(),
  ],
};
```

### Custom Options

```javascript
import findUnusedFilesPlugin from "vite-plugin-unused-files";

export default {
  plugins: [
    findUnusedFilesPlugin({
      entryFile: "src/main.jsx",
      alias: { "@": "src" },
      include: ["src/**/*.{tsx,ts,jsx,js,css,scss,png,jpg,gif,svg}"],
      exclude: ["src/**/*.d.ts"],
      dryRun: true,
    }),
  ],
};
```

## Info

- Recognizable import formats include:

  ```javascript
  import "./style.css"; // Static import of style files
  import { something } from "./module"; // Import specific content from a module
  import("./dynamic-module"); // Dynamic import of a module
  lazy(() => import("./lazy-module")); // Lazy loading of a module
  ```

- Use cases:

  - Suitable for scenarios where you need to clean up unused files in a project.
  - You can set `dryRun` to `false` to automatically delete unused files, or set it to `true` to only print information about unused files.
  - Supports customization of entry files, aliases, included and excluded file types.

- Notes:
  - The final result is for reference only; it is recommended to back up files before deletion.
  - The effectiveness of the plugin depends on the structure and import methods of the project, and may need adjustments based on the specific project.
