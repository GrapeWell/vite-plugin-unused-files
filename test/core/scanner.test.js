import { describe, it, expect, vi, beforeEach } from "vitest";
import { scanFiles } from "../../src/core/scanner.mjs";
import glob from "fast-glob";

vi.mock("fast-glob");

describe("Scanner", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should scan files and extract extensions", async () => {
    const mockFiles = ["src/index.js", "src/App.vue", "src/style.css"];
    glob.mockResolvedValue(mockFiles);

    const root = process.cwd();
    const { files, allFilesSet, extensions } = await scanFiles({
      root,
      include: ["src/**/*"],
      exclude: [],
    });

    expect(files).toEqual(mockFiles);
    expect(allFilesSet.size).toBe(3);
    expect(extensions.has(".js")).toBe(true);
    expect(extensions.has(".vue")).toBe(true);
    expect(extensions.has(".css")).toBe(true);
  });

  it("should sort extensions by priority", async () => {
    const mockFiles = ["a.css", "b.js", "c.vue"];
    glob.mockResolvedValue(mockFiles);

    const { extensions } = await scanFiles({
      root: process.cwd(),
      include: ["**/*"],
    });

    const extArray = Array.from(extensions);

    const vueIndex = extArray.indexOf(".vue");
    const jsIndex = extArray.indexOf(".js");
    const cssIndex = extArray.indexOf(".css");

    expect(vueIndex).toBeLessThan(jsIndex);
    expect(jsIndex).toBeLessThan(cssIndex);
  });
});
