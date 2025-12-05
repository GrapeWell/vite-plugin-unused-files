import parser from "@babel/parser";
import _traverse from "@babel/traverse";
const traverse = _traverse.default || _traverse;
import { parse as vueParser } from "@vue/compiler-sfc";
import postcss from "postcss";
import postcssLess from "postcss-less";
import postcssScss from "postcss-scss";

export const parseJsxContent = (content) => {
  const ast = parser.parse(content, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });
  const imports = [];

  traverse(ast, {
    ImportDeclaration(path) {
      imports.push(path.node.source.value);
    },
    CallExpression(path) {
      if (
        path.node.callee.type === "Import" ||
        (path.node.callee.name === "require" && path.node.arguments[0]?.value)
      ) {
        imports.push(path.node.arguments[0].value);
      }
    },
    JSXAttribute(path) {
      // 处理 JSX 中的资源引用
      if (
        (path.node.name.name === "src" || path.node.name.name === "href") &&
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

export const parseVueContent = async (content) => {
  const imports = [];
  const { descriptor } = vueParser(content);

  // Parse script content
  if (descriptor.script || descriptor.scriptSetup) {
    const scriptContent = (descriptor.script || descriptor.scriptSetup).content;
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
        const processor = style.lang === "less" ? postcssLess : postcssScss;
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

export const parseStyleContent = async (content, ext) => {
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
