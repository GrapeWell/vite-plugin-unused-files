import findUnusedFilesPlugin from "../src/index.mjs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "fixtures/simple-project");

const plugin = findUnusedFilesPlugin({
  root,
  include: ["src/**/*"],
  dryRun: true,
});

(async () => {
  try {
    await plugin.buildStart();
  } catch (e) {
    console.error(e);
  }
})();
