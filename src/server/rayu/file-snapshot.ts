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

function isExcluded(filePath: string, rootDir: string, ignorePatterns: string[]): boolean {
  const relPath = path.relative(rootDir, filePath).split(path.sep).join("/");
  
  for (const exclude of DEFAULT_EXCLUDES) {
    if (relPath === exclude || relPath.startsWith(`${exclude}/`)) {
      return true;
    }
  }

  // Basic .gitignore matching (simplified for this task since we can't use `ignore` package)
  for (const pattern of ignorePatterns) {
    if (!pattern || pattern.startsWith("#")) continue;
    
    let regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
      
    // If pattern ends with /, we want to match directory and its contents
    if (regexPattern.endsWith("/")) {
      regexPattern = regexPattern.slice(0, -1); // remove /
      regexPattern = "(^|/)" + regexPattern + "(/|$)";
    } else {
      if (pattern.startsWith("/")) {
        regexPattern = "^" + regexPattern.substring(1); // remove /
      } else {
        regexPattern = "(^|/)" + regexPattern + "(/|$)";
      }
    }

    try {
      if (new RegExp(regexPattern).test(relPath)) {
        return true;
      }
    } catch {
      // Ignore invalid regex patterns
    }
  }

  return false;
}

/** Takes a snapshot of file paths + mtimes under workspace (non-recursive gitignore-aware) */
export async function takeSnapshot(workspaceDir: string): Promise<Map<string, number>> {
  const snapshot = new Map<string, number>();
  let ignorePatterns: string[] = [];

  try {
    const gitignoreContent = await fs.readFile(path.join(workspaceDir, ".gitignore"), "utf8");
    ignorePatterns = gitignoreContent.split(/\r?\n/);
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
      
      if (isExcluded(fullPath, workspaceDir, ignorePatterns)) {
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
