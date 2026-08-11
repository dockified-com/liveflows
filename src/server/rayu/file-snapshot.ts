import * as fs from "node:fs/promises";
import * as path from "node:path";
import type { FileChange } from "./types";

export interface FileEntry {
  path: string;
  mtimeMs: number;
}

const DEFAULT_EXCLUDES = [
  "node_modules",
  ".next",
  ".git"
];

function isExcluded(filePath: string, rootDir: string, ignoreRegexes: RegExp[]): boolean {
  const relPath = path.relative(rootDir, filePath).split(path.sep).join("/");
  
  const segments = relPath.split("/");
  if (segments.some((seg) => DEFAULT_EXCLUDES.includes(seg))) return true;

  // Basic .gitignore matching (simplified for this task since we can't use `ignore` package)
  for (const regex of ignoreRegexes) {
    if (regex.test(relPath)) {
      return true;
    }
  }

  return false;
}

/** Takes a snapshot of file paths + mtimes under workspace (non-recursive gitignore-aware) */
export async function takeSnapshot(workspaceDir: string): Promise<Map<string, number>> {
  const snapshot = new Map<string, number>();
  let ignoreRegexes: RegExp[] = [];

  try {
    const gitignoreContent = await fs.readFile(path.join(workspaceDir, ".gitignore"), "utf8");
    const patterns = gitignoreContent.split(/\r?\n/);
    
    for (const pattern of patterns) {
      const trimmed = pattern.trim();
      if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("!")) continue;
      
      const isAnchored = trimmed.startsWith("/");
      const isDirOnly = trimmed.endsWith("/");
      let cleanPattern = trimmed;
      if (isAnchored) cleanPattern = cleanPattern.slice(1);
      if (isDirOnly) cleanPattern = cleanPattern.slice(0, -1);
      
      let regexStr = cleanPattern
        .replace(/[.+^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*")
        .replace(/\?/g, ".");
        
      const prefix = isAnchored ? "^" : "(^|/)";
      const suffix = "(/|$)";
      
      try {
        ignoreRegexes.push(new RegExp(prefix + regexStr + suffix));
      } catch {
        // Ignore invalid regex patterns
      }
    }
  } catch {
    // No .gitignore, that's fine
  }

  async function walk(dir: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (isExcluded(fullPath, workspaceDir, ignoreRegexes)) {
        continue;
      }

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        try {
          const stats = await fs.stat(fullPath);
          const relPath = path.relative(workspaceDir, fullPath).split(path.sep).join("/");
          snapshot.set(relPath, stats.mtimeMs);
        } catch {
          // File might have been deleted, ignore
        }
      }
    }
  }

  await walk(workspaceDir);
  return snapshot;
}

/** Compares before/after snapshots to determine created and modified files */
export function diffSnapshots(
  before: Map<string, number>,
  after: Map<string, number>
): FileChange[] {
  const changes: FileChange[] = [];

  for (const [filePath, afterMtime] of after.entries()) {
    const beforeMtime = before.get(filePath);

    if (beforeMtime === undefined) {
      changes.push({ path: filePath, type: "created" });
    } else if (afterMtime > beforeMtime) {
      changes.push({ path: filePath, type: "modified" });
    }
  }

  return changes;
}

/** Checks which changed files are outside the permitted list */
export function findUnauthorized(
  changes: FileChange[],
  permitted: string[]
): string[] {
  const permittedSet = new Set(permitted);
  const unauthorized = new Set<string>();

  for (const change of changes) {
    if (!permittedSet.has(change.path)) {
      unauthorized.add(change.path);
    }
  }

  return Array.from(unauthorized);
}
