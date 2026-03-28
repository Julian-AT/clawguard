/** In-memory overlay of file path → latest UTF-8 content (e.g. after `file_write`) for repo_search. */
const overlayBySandbox = new Map<string, Map<string, string>>();

export function registerRepoSearchOverlay(sandboxKey: string, path: string, content: string): void {
  if (!sandboxKey) return;
  let m = overlayBySandbox.get(sandboxKey);
  if (!m) {
    m = new Map();
    overlayBySandbox.set(sandboxKey, m);
  }
  m.set(path, content);
}

export function getRepoSearchOverlay(sandboxKey: string): Map<string, string> | undefined {
  return overlayBySandbox.get(sandboxKey);
}
