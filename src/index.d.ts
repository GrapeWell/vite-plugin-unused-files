export interface FindUnusedFilesPluginOptions {
  include?: string[];
  exclude?: string[];
  alias?: Record<string, string>;
  root?: string;
  dryRun?: boolean;
  failOnUnused?: boolean;
}

/**
 * Vite Plugin to find and optionally delete unused files in a project.
 */
export default function findUnusedFilesPlugin(
  options?: FindUnusedFilesPluginOptions
): import("vite").Plugin;
