export interface FindUnusedFilesPluginOptions {
  include?: string[];
  exclude?: string[];
  entryFile?: string;
  alias?: Record<string, string>;
  root?: string;
  dryRun?: boolean;
}

/**
 * Vite Plugin to find and optionally delete unused files in a project.
 */
export default function findUnusedFilesPlugin(
  options?: FindUnusedFilesPluginOptions
): import("vite").Plugin;
