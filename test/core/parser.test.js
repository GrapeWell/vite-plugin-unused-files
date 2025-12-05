import { describe, it, expect } from "vitest";
import {
  parseJsxContent,
  parseVueContent,
  parseStyleContent,
} from "../../src/core/parser.mjs";

describe("Parser", () => {
  describe("parseJsxContent", () => {
    it("should parse static imports", () => {
      const code = `
        import React from 'react';
        import { useState } from 'react';
        import './style.css';
      `;
      const imports = parseJsxContent(code);
      expect(imports).toEqual(["react", "react", "./style.css"]);
    });

    it("should parse dynamic imports", () => {
      const code = `
        const Component = React.lazy(() => import('./Component'));
      `;
      const imports = parseJsxContent(code);
      expect(imports).toEqual(["./Component"]);
    });

    it("should parse require calls", () => {
      const code = `
        const data = require('./data.json');
      `;
      const imports = parseJsxContent(code);
      expect(imports).toEqual(["./data.json"]);
    });

    it("should parse JSX src/href attributes", () => {
      const code = `
        const App = () => (
          <div>
            <img src="./image.png" />
            <a href="/page" />
            <link href="./style.css" />
          </div>
        );
      `;
      const imports = parseJsxContent(code);
      expect(imports).toContain("./image.png");
      expect(imports).toContain("./style.css");
    });
  });

  describe("parseVueContent", async () => {
    it("should parse script imports", async () => {
      const code = `
        <script>
        import Component from './Component.vue';
        </script>
      `;
      const imports = await parseVueContent(code);
      expect(imports).toContain("./Component.vue");
    });

    it("should parse script setup imports", async () => {
      const code = `
        <script setup>
        import { ref } from 'vue';
        import './style.css';
        </script>
      `;
      const imports = await parseVueContent(code);
      expect(imports).toContain("vue");
      expect(imports).toContain("./style.css");
    });

    it("should parse template src attributes", async () => {
      const code = `
        <template>
          <img src="./logo.png" />
        </template>
      `;
      const imports = await parseVueContent(code);
      expect(imports).toContain("./logo.png");
    });

    it("should parse style imports", async () => {
      const code = `
        <style lang="less">
          @import './variables.less';
          .box { background: url('./bg.png'); }
        </style>
      `;
      const imports = await parseVueContent(code);
      expect(imports).toContain("./variables.less");
      expect(imports).toContain("./bg.png");
    });
  });

  describe("parseStyleContent", () => {
    it("should parse @import in less", async () => {
      const code = `@import './base.less';`;
      const imports = await parseStyleContent(code, ".less");
      expect(imports).toEqual(["./base.less"]);
    });

    it("should parse url() in scss", async () => {
      const code = `body { background-image: url('./image.jpg'); }`;
      const imports = await parseStyleContent(code, ".scss");
      expect(imports).toEqual(["./image.jpg"]);
    });
  });
});
