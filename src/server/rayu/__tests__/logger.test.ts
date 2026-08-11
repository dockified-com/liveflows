import * as fs from "node:fs/promises";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendLog, type LogEntry } from "../logger";

vi.mock("node:fs/promises");

describe("logger", () => {
  const workspaceDir = "/tmp/test-workspace";
  const logDir = path.join(workspaceDir, ".kiro");
  const logPath = path.join(logDir, "rayu-worker.log");
  const rotatedPath = path.join(logDir, "rayu-worker.1.log");

  const mockEntry: LogEntry = {
    timestamp: "2025-01-15T10:30:45.123+08:00",
    taskDescription: "Test task",
    exitCode: 0,
    durationMs: 1000,
    filesChanged: ["src/test.ts"],
  };

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should create log directory and append log entry", async () => {
    vi.mocked(fs.stat).mockRejectedValue({ code: "ENOENT" });
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);

    await appendLog(mockEntry, workspaceDir);

    expect(fs.stat).toHaveBeenCalledWith(logPath);
    expect(fs.mkdir).toHaveBeenCalledWith(logDir, { recursive: true });
    expect(fs.appendFile).toHaveBeenCalledWith(
      logPath,
      JSON.stringify(mockEntry) + "\n",
      "utf-8",
    );
  });

  it("should rotate file if it exceeds 5MB", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 5 * 1024 * 1024 + 1 } as any);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);

    await appendLog(mockEntry, workspaceDir);

    expect(fs.stat).toHaveBeenCalledWith(logPath);
    expect(fs.rename).toHaveBeenCalledWith(logPath, rotatedPath);
    expect(fs.appendFile).toHaveBeenCalledWith(
      logPath,
      JSON.stringify(mockEntry) + "\n",
      "utf-8",
    );
  });

  it("should not rotate file if it is under 5MB", async () => {
    vi.mocked(fs.stat).mockResolvedValue({ size: 1024 } as any);
    vi.mocked(fs.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.appendFile).mockResolvedValue(undefined);

    await appendLog(mockEntry, workspaceDir);

    expect(fs.stat).toHaveBeenCalledWith(logPath);
    expect(fs.rename).not.toHaveBeenCalled();
    expect(fs.appendFile).toHaveBeenCalledWith(
      logPath,
      JSON.stringify(mockEntry) + "\n",
      "utf-8",
    );
  });

  it("should fail gracefully without throwing if stat fails", async () => {
    vi.mocked(fs.stat).mockRejectedValue(new Error("EACCES"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await appendLog(mockEntry, workspaceDir);

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to stat log file"),
    );
    expect(fs.appendFile).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
