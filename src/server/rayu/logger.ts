import * as fs from "node:fs/promises";
import * as path from "node:path";

export interface LogEntry {
  timestamp: string; // ISO 8601 with timezone
  taskDescription: string; // first 200 chars
  exitCode: number;
  durationMs: number;
  filesChanged: string[];
  errorOutput?: string; // stderr, last 10,000 chars (only on non-zero exit)
}

const LOG_FILE = ".kiro/rayu-worker.log";
const ROTATED_FILE = ".kiro/rayu-worker.1.log";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export async function appendLog(
  entry: LogEntry,
  workspaceDir = process.cwd(),
): Promise<void> {
  const logPath = path.join(workspaceDir, LOG_FILE);
  const rotatedPath = path.join(workspaceDir, ROTATED_FILE);

  try {
    const stats = await fs.stat(logPath);
    if (stats.size > MAX_FILE_SIZE) {
      await fs.rename(logPath, rotatedPath);
    }
  } catch (error: any) {
    if (error.code !== "ENOENT") {
      console.error(`[Task_Dispatcher] Failed to stat log file: ${error.message}`);
      return; // Fail-open: don't block execution
    }
  }

  const logDir = path.dirname(logPath);
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (error: any) {
    if (error.code !== "EEXIST") {
      console.error(`[Task_Dispatcher] Failed to create log directory: ${error.message}`);
      return;
    }
  }

  try {
    const jsonLine = JSON.stringify(entry) + "\n";
    await fs.appendFile(logPath, jsonLine, "utf-8");
  } catch (error: any) {
    console.error(`[Task_Dispatcher] Failed to append log: ${error.message}`);
  }
}
