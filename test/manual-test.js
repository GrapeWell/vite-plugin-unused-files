const findUnusedFilesPlugin = require("../src/index.js");
const path = require("path");

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
