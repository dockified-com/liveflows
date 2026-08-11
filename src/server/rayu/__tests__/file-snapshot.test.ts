import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as os from "node:os";
import { takeSnapshot, diffSnapshots, findUnauthorized } from "../file-snapshot";
import type { FileChange } from "../types";

describe("File Snapshot Module", () => {
  describe("diffSnapshots (Property 4)", () => {
    it("Feature: rayu-worker-agent, Property 4: File snapshot diff correctly detects created and modified files", () => {
      fc.assert(
        fc.property(
          fc.dictionary(fc.string(), fc.float({ noNaN: true })),
          fc.dictionary(fc.string(), fc.float({ noNaN: true })),
          (beforeObj, afterObj) => {
            const before = new Map(Object.entries(beforeObj));
            const after = new Map(Object.entries(afterObj));

            const changes = diffSnapshots(before, after);

            // Verify "created"
            const created = changes.filter((c) => c.type === "created").map((c) => c.path);
            for (const path of created) {
              expect(after.has(path)).toBe(true);
              expect(before.has(path)).toBe(false);
            }

            // Verify "modified"
            const modified = changes.filter((c) => c.type === "modified").map((c) => c.path);
            for (const path of modified) {
              expect(after.has(path)).toBe(true);
              expect(before.has(path)).toBe(true);
              expect(after.get(path)!).toBeGreaterThan(before.get(path)!);
            }

            // Verify completeness
            for (const [path, afterMtime] of after.entries()) {
              if (!before.has(path)) {
                expect(created).toContain(path);
              } else if (afterMtime > before.get(path)!) {
                expect(modified).toContain(path);
              }
            }

            // Verify no extraneous changes
            for (const change of changes) {
              expect(after.has(change.path)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect specific known scenarios", () => {
      const before = new Map([
        ["file1.txt", 100],
        ["file2.txt", 200],
        ["file3.txt", 300],
      ]);
      const after = new Map([
        ["file1.txt", 100], // Unchanged
        ["file2.txt", 250], // Modified
        ["file4.txt", 400], // Created
      ]);

      const changes = diffSnapshots(before, after);
      expect(changes).toEqual([
        { path: "file2.txt", type: "modified" },
        { path: "file4.txt", type: "created" },
      ]);
    });
  });

  describe("findUnauthorized (Property 7)", () => {
    it("Feature: rayu-worker-agent, Property 7: Unauthorized file detection identifies exactly the files outside the permitted set", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              path: fc.string(),
              type: fc.constantFrom("created", "modified") as fc.Arbitrary<"created" | "modified">,
            })
          ),
          fc.array(fc.string()),
          (changesArr, permittedArr) => {
            const changes = changesArr as FileChange[];
            const permitted = permittedArr;

            const unauthorized = findUnauthorized(changes, permitted);

            const permittedSet = new Set(permitted);
            const expectedUnauthorized = new Set(
              changes.map((c) => c.path).filter((p) => !permittedSet.has(p))
            );

            expect(new Set(unauthorized)).toEqual(expectedUnauthorized);
            expect(unauthorized.length).toBe(expectedUnauthorized.size); // no duplicates
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle mixed authorized/unauthorized changes", () => {
      const changes: FileChange[] = [
        { path: "src/a.ts", type: "created" },
        { path: "src/b.ts", type: "modified" },
        { path: "src/c.ts", type: "modified" },
      ];
      const permitted = ["src/a.ts", "src/c.ts"];

      const unauthorized = findUnauthorized(changes, permitted);
      expect(unauthorized).toEqual(["src/b.ts"]);
    });
  });

  describe("takeSnapshot", () => {
    let tempDir: string;

    beforeEach(async () => {
      tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "rayu-test-"));
    });

    afterEach(async () => {
      await fs.rm(tempDir, { recursive: true, force: true });
    });

    it("should take snapshot of real filesystem excluding default dirs", async () => {
      await fs.mkdir(path.join(tempDir, "src"));
      await fs.writeFile(path.join(tempDir, "src/index.ts"), "content");
      await fs.writeFile(path.join(tempDir, "package.json"), "{}");

      // Default excludes
      await fs.mkdir(path.join(tempDir, "node_modules"));
      await fs.writeFile(path.join(tempDir, "node_modules/dep.js"), "");
      await fs.mkdir(path.join(tempDir, ".git"));
      await fs.writeFile(path.join(tempDir, ".git/config"), "");

      const snapshot = await takeSnapshot(tempDir);
      
      expect(snapshot.has("src/index.ts")).toBe(true);
      expect(snapshot.has("package.json")).toBe(true);
      expect(snapshot.has("node_modules/dep.js")).toBe(false);
      expect(snapshot.has(".git/config")).toBe(false);
    });

    it("should exclude files matching .gitignore patterns", async () => {
      await fs.writeFile(path.join(tempDir, ".gitignore"), "ignored.txt\nbuild/");
      await fs.writeFile(path.join(tempDir, "file.txt"), "");
      await fs.writeFile(path.join(tempDir, "ignored.txt"), "");
      
      await fs.mkdir(path.join(tempDir, "build"));
      await fs.writeFile(path.join(tempDir, "build/out.js"), "");

      const snapshot = await takeSnapshot(tempDir);
      
      expect(snapshot.has("file.txt")).toBe(true);
      expect(snapshot.has(".gitignore")).toBe(true);
      expect(snapshot.has("ignored.txt")).toBe(false);
      expect(snapshot.has("build/out.js")).toBe(false);
    });

    it("should exclude nested default directories", async () => {
      await fs.mkdir(path.join(tempDir, "foo"));
      await fs.mkdir(path.join(tempDir, "foo/node_modules"));
      await fs.writeFile(path.join(tempDir, "foo/node_modules/file.js"), "");

      const snapshot = await takeSnapshot(tempDir);
      
      expect(snapshot.has("foo/node_modules/file.js")).toBe(false);
    });

    it("should handle leading slash patterns correctly", async () => {
      await fs.writeFile(path.join(tempDir, ".gitignore"), "/dist/\n/file.txt\n!/not_ignored.txt");
      await fs.writeFile(path.join(tempDir, "file.txt"), ""); // ignored
      await fs.writeFile(path.join(tempDir, "not_ignored.txt"), ""); // not ignored because of !
      
      await fs.mkdir(path.join(tempDir, "dist"));
      await fs.writeFile(path.join(tempDir, "dist/out.js"), ""); // ignored
      
      await fs.mkdir(path.join(tempDir, "foo"));
      await fs.writeFile(path.join(tempDir, "foo/file.txt"), ""); // NOT ignored (pattern is /file.txt)
      await fs.mkdir(path.join(tempDir, "foo/dist"));
      await fs.writeFile(path.join(tempDir, "foo/dist/out.js"), ""); // NOT ignored (pattern is /dist/)

      const snapshot = await takeSnapshot(tempDir);
      
      expect(snapshot.has("file.txt")).toBe(false);
      expect(snapshot.has("dist/out.js")).toBe(false);
      expect(snapshot.has("not_ignored.txt")).toBe(true);
      expect(snapshot.has("foo/file.txt")).toBe(true);
      expect(snapshot.has("foo/dist/out.js")).toBe(true);
    });
  });
});
