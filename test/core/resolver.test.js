import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  resolveImportPath,
  resolveFilePath,
} from "../../src/core/resolver.mjs";
import path from "path";
import fs from "fs/promises";

vi.mock("fs/promises");

describe("Resolver", () => {
  const root = path.resolve("/project");
  const currentFile = path.join(root, "src/index.js");
  const alias = { "@": path.join(root, "src") };
  const extensions = new Set([".js", ".ts", ".vue"]);

  describe("resolveImportPath", () => {
    it("should resolve alias paths", () => {
      const result = resolveImportPath(
        "@/components/Button",
        currentFile,
        alias,
        root
      );
      expect(result).toContain("src/components/Button");
    });

    it("should resolve relative paths", () => {
      const result = resolveImportPath("./utils", currentFile, alias, root);
      expect(result).toContain("src/utils");
    });
  });

  describe("resolveFilePath", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    it("should resolve exact file match", async () => {
      fs.access.mockResolvedValue(undefined);
      const result = await resolveFilePath(
        "./utils.js",
        currentFile,
        alias,
        root,
        extensions
      );
      expect(result).toBeTruthy();
      expect(result).toContain("utils.js");
    });

    it("should resolve file with extension lookup", async () => {
      fs.access.mockImplementation(async (p) => {
        if (p.endsWith("utils.js")) return undefined;
        throw new Error("ENOENT");
      });

      const result = await resolveFilePath(
        "./utils",
        currentFile,
        alias,
        root,
        extensions
      );
      expect(result).toContain("utils.js");
    });

    it("should resolve index file in directory", async () => {
      fs.stat.mockResolvedValue({ isDirectory: () => true });

      fs.access.mockImplementation(async (p) => {
        if (p.endsWith("index.js")) return undefined;
        throw new Error("ENOENT");
      });

      const result = await resolveFilePath(
        "./dir",
        currentFile,
        alias,
        root,
        extensions
      );
      expect(result).toContain("index.js");
    });
  });
});
