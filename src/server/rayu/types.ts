/** Structured task instruction sent to Rayu Code via stdin */
export interface TaskInstruction {
  /** Human-readable description of what Rayu should do */
  description: string;
  /** File paths relevant as context (will be read and included) */
  contextFiles: string[];
  /** Rules/conventions the agent must follow */
  constraints: string[];
  /** File paths Rayu is permitted to create or modify (1-50 entries) */
  permittedFiles: string[];
  /** Description of expected output artifacts */
  expectedOutput: string;
  /** Optional: environment variables to pass (beyond inherited) */
  envOverrides?: Record<string, string>;
}

/** Result returned after Rayu Code execution completes */
export interface TaskResult {
  /** Process exit code (0 = success, -1 = timeout) */
  exitCode: number;
  /** Captured stdout (truncated to last 100KB if exceeded) */
  stdout: string;
  /** Captured stderr (truncated to last 100KB if exceeded) */
  stderr: string;
  /** Files created or modified during execution */
  filesChanged: FileChange[];
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Whether stdout/stderr were truncated */
  truncated: { stdout: boolean; stderr: boolean };
  /** Failure classification (null if exitCode === 0) */
  failureClass: "retriable" | "non-retriable" | null;
  /** Files modified outside the permitted list */
  unauthorizedChanges: string[];
  /** Git state before/after (null if not a git repo) */
  gitInfo: GitInfo | null;
  /** Lint errors if workspace defines pnpm lint */
  lintErrors: LintError[] | null;
}

export interface FileChange {
  path: string;
  type: "created" | "modified";
}

export interface GitInfo {
  /** HEAD commit hash before execution */
  preHeadHash: string;
  /** Working tree status before execution */
  preWorkingTree: GitFileStatus[];
  /** Unified diff of all changes relative to pre-HEAD */
  diff: string;
  /** Warning if pre-existing uncommitted changes existed */
  dirtyWarning: string | null;
}

export interface GitFileStatus {
  path: string;
  status: "modified" | "added" | "deleted" | "untracked";
}

export interface LintError {
  file: string;
  message: string;
}

export interface DispatchOptions {
  /** Workspace root directory (must contain package.json with name "liveflows") */
  workspaceDir: string;
  /** The task instruction to send */
  instruction: TaskInstruction;
  /** Optional timeout override in seconds (30-3600) */
  timeoutSeconds?: number;
}

export type DispatchResult =
  | { ok: true; result: TaskResult }
  | { ok: false; error: DispatchError };

export interface DispatchError {
  code:
    | "BINARY_NOT_FOUND"
    | "STARTUP_TIMEOUT"
    | "STDIN_WRITE_FAILED"
    | "WORKSPACE_INVALID"
    | "CONFIG_INVALID"
    | "QUEUE_FULL"
    | "PROCESS_UNKILLABLE";
  message: string;
}
