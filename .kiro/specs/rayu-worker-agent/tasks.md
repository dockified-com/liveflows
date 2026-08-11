# Implementation Plan: Rayu Worker Agent

## Overview

Implement the Task_Dispatcher module at `src/server/rayu/` that enables Kiro to delegate coding tasks to Rayu Code by spawning it as a CLI child process. The module handles instruction formatting, process lifecycle, result collection, concurrency control, git integration, and logging — all using Node.js built-in modules with no runtime dependencies.

## Tasks

- [ ] 1. Project setup and core type definitions
  - [ ] 1.1 Install fast-check as a dev dependency and create module directory structure
    - Run `pnpm add -D fast-check`
    - Create `src/server/rayu/` directory
    - Create `src/server/rayu/__tests__/` directory
    - _Requirements: N/A (infrastructure)_

  - [ ] 1.2 Create `src/server/rayu/types.ts` with all TypeScript interfaces
    - Define `TaskInstruction`, `TaskResult`, `FileChange`, `GitInfo`, `GitFileStatus`, `LintError` interfaces
    - Define `DispatchOptions`, `DispatchResult`, `DispatchError` interfaces
    - Ensure all fields match the design document exactly
    - _Requirements: 2.1, 3.4, 5.1, 10.3_

- [ ] 2. Configuration module
  - [ ] 2.1 Implement `src/server/rayu/config.ts`
    - Define `RayuConfig`, `RayuConfigFile`, `ConfigResult` types
    - Implement `loadConfig(workspaceDir: string): Promise<ConfigResult>` that reads `.kiro/rayu-config.json`
    - Implement validation: `timeoutSeconds` in [30, 3600], `maxOutputBytes` in [1024, 10485760], `cliFlags` max 20 non-empty strings, `binaryPath` non-empty
    - Implement environment variable overrides: `RAYU_BINARY_PATH`, `RAYU_TIMEOUT`, `RAYU_MAX_OUTPUT`, `RAYU_CLI_FLAGS`
    - Return default config when file does not exist
    - Return validation error with field name and constraint on invalid JSON or out-of-range values
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

  - [ ]* 2.2 Write property tests for config validation (Property 8)
    - **Property 8: Configuration validation rejects out-of-range values and accepts valid ones**
    - Generate arbitrary config objects with in-range and out-of-range values using fast-check
    - Verify rejection for out-of-range `timeoutSeconds`, `maxOutputBytes`, oversized `cliFlags`, empty strings
    - Verify acceptance for all valid configs
    - **Validates: Requirements 7.2, 7.5, 7.6, 7.7**

  - [ ]* 2.3 Write property tests for environment variable override precedence (Property 9)
    - **Property 9: Environment variable overrides take precedence over config file values**
    - Generate arbitrary valid config + arbitrary valid env overrides
    - Verify resolved config uses env values where present, file values where not
    - **Validates: Requirements 7.4**

  - [ ]* 2.4 Write unit tests for `config.ts`
    - Test known-good config file parsing
    - Test missing config file defaults
    - Test invalid JSON syntax error
    - Test each field out-of-range independently
    - Test env var override scenarios
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 3. Instruction builder module
  - [ ] 3.1 Implement `src/server/rayu/instruction-builder.ts`
    - Implement `buildInstructionText(ctx: BuildContext): string` that formats all sections with `##` delimiters
    - Implement `isCreationTask(description: string): boolean` that detects file-creation keywords
    - Implement `validateInstruction(instruction: TaskInstruction): { valid: boolean; error?: string }` that rejects empty mandatory fields and enforces permittedFiles count 1-50
    - Implement context priority ordering: AGENTS.md first, then referenced files in order, then directory structure
    - Enforce `maxContextBytes` budget with priority-based truncation/omission
    - Include notes for missing files in context
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [ ]* 3.2 Write property tests for instruction formatting (Property 1)
    - **Property 1: Instruction formatting produces all mandatory sections**
    - Generate arbitrary valid `TaskInstruction` objects with non-empty fields
    - Verify output contains exactly the five mandatory section headers each appearing once
    - **Validates: Requirements 2.1, 2.6**

  - [ ]* 3.3 Write property tests for instruction validation (Property 2)
    - **Property 2: Instruction validation rejects incomplete instructions**
    - Generate `TaskInstruction` with at least one empty mandatory field
    - Verify rejection identifies the missing section by name
    - **Validates: Requirements 2.7**

  - [ ]* 3.4 Write property tests for permitted files bounds (Property 3)
    - **Property 3: Permitted files count is bounded**
    - Generate `permittedFiles` arrays of length 0, 1-50, and >50
    - Verify rejection for 0 and >50, acceptance for 1-50
    - **Validates: Requirements 2.3, 6.3**

  - [ ]* 3.5 Write property tests for context byte budget (Property 10)
    - **Property 10: Context injection respects the byte budget with priority ordering**
    - Generate arbitrary AGENTS.md content, file contents, and directory structure of varying sizes
    - Verify total injected context never exceeds budget
    - Verify priority ordering: AGENTS.md > files > directory structure
    - **Validates: Requirements 8.6, 8.7**

  - [ ]* 3.6 Write unit tests for `instruction-builder.ts`
    - Test specific formatting output structure
    - Test AGENTS.md inclusion/exclusion
    - Test creation-task keyword detection
    - Test context truncation with large files
    - _Requirements: 2.1, 2.6, 8.1, 8.5_

- [ ] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. File snapshot module
  - [ ] 5.1 Implement `src/server/rayu/file-snapshot.ts`
    - Implement `takeSnapshot(workspaceDir: string): Promise<Map<string, number>>` that walks the workspace collecting file paths and mtimes
    - Exclude `node_modules/`, `.next/`, `.git/` directories and `.gitignore` patterns
    - Implement `diffSnapshots(before, after): FileChange[]` — pure function comparing two maps
    - Implement `findUnauthorized(changes, permitted): string[]` — pure function filtering unauthorized changes
    - _Requirements: 3.3, 6.4_

  - [ ]* 5.2 Write property tests for file snapshot diff (Property 4)
    - **Property 4: File snapshot diff correctly detects created and modified files**
    - Generate arbitrary before/after `Map<string, number>` pairs
    - Verify "created" iff path in `after` but not `before`; "modified" iff in both with greater mtime in `after`
    - **Validates: Requirements 3.3**

  - [ ]* 5.3 Write property tests for unauthorized file detection (Property 7)
    - **Property 7: Unauthorized file detection identifies exactly the files outside the permitted set**
    - Generate arbitrary `FileChange[]` and permitted file lists
    - Verify result contains exactly paths not in permitted list, no duplicates, no permitted paths
    - **Validates: Requirements 6.4**

  - [ ]* 5.4 Write unit tests for `file-snapshot.ts`
    - Test `takeSnapshot` with real filesystem in temp directory
    - Test `diffSnapshots` with specific known scenarios (new files, modified files, unchanged files, deleted files)
    - Test `findUnauthorized` with mixed authorized/unauthorized changes
    - _Requirements: 3.3, 6.4_

- [ ] 6. Process runner module
  - [ ] 6.1 Implement `src/server/rayu/process-runner.ts`
    - Implement `runProcess(options: RunOptions): Promise<RunResult>` using `child_process.spawn`
    - Write `stdinContent` to the process stdin and close the stream
    - Collect stdout and stderr into buffers with size enforcement
    - Implement output truncation: keep last N bytes, prepend marker with original size
    - Implement timeout: SIGTERM at timeout, SIGKILL after 5s grace, unkillable detection after another 5s
    - Record duration from spawn to exit
    - Handle spawn errors (binary not found, startup timeout of 10s)
    - Implement failure classification: 124/137 → retriable, 126/127 → non-retriable, other non-zero → retriable
    - _Requirements: 1.1, 1.2, 1.4, 1.5, 1.6, 1.7, 3.1, 3.2, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 6.2 Write property tests for output truncation (Property 5)
    - **Property 5: Output truncation preserves the last N bytes and prepends a marker**
    - Generate arbitrary strings (0-500KB) and arbitrary max sizes
    - Verify: if content exceeds max, result has marker + last M bytes; if not, content unchanged
    - **Validates: Requirements 3.5, 5.5**

  - [ ]* 6.3 Write property tests for failure classification (Property 6)
    - **Property 6: Failure classification is deterministic and total**
    - Generate arbitrary integers across the full range
    - Verify: 124/137 → retriable, 126/127 → non-retriable, other non-zero → retriable, 0 → null
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

  - [ ]* 6.4 Write unit tests for `process-runner.ts`
    - Mock `child_process.spawn` to test stdin write, timeout sequence (SIGTERM→SIGKILL), stream capture
    - Test binary-not-found scenario
    - Test startup timeout (10s)
    - Test stdin write failure
    - _Requirements: 1.1, 1.5, 1.6, 1.7, 4.2_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Queue module
  - [ ] 8.1 Implement `src/server/rayu/queue.ts`
    - Implement `WorkspaceQueue` class with configurable `maxDepth` (default 10)
    - Enforce single concurrency per workspace: only one task executing at a time
    - Implement `enqueue(workspaceDir, execute)` that queues or rejects if full
    - Implement `depth(workspaceDir)` and `isRunning(workspaceDir)` helpers
    - Normalize workspace paths for consistent keying
    - Drain queue sequentially: when running task completes, start next pending task
    - _Requirements: 4.5, 4.6, 4.7_

  - [ ]* 8.2 Write property tests for queue concurrency (Property 11)
    - **Property 11: Queue enforces maximum depth and single concurrency per workspace**
    - Generate arbitrary sequences of enqueue operations
    - Verify: never more than 10 pending, rejection at depth 10, at most one executing per workspace
    - **Validates: Requirements 4.5, 4.6, 4.7**

  - [ ]* 8.3 Write unit tests for `queue.ts`
    - Test sequential execution order
    - Test rejection at depth 10
    - Test multiple workspaces are independent
    - Test task failure doesn't block queue
    - _Requirements: 4.5, 4.6, 4.7_

- [ ] 9. Logger module
  - [ ] 9.1 Implement `src/server/rayu/logger.ts`
    - Implement `appendLog(logDir, entry): Promise<void>` that writes JSON Lines to `.kiro/logs/rayu-sessions.log`
    - Each entry: `timestamp` (ISO 8601 with timezone), `task_description` (first 200 chars), `exit_code`, `duration_ms`, `files_changed`
    - Include `error_output` (last 10,000 chars of stderr) when exit code is non-zero
    - Implement log rotation: rename to `.log.1` when file exceeds 10MB before appending
    - On filesystem write error: emit warning to stderr, do not throw
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]* 9.2 Write property tests for log entries (Property 12)
    - **Property 12: Log entries are valid JSON Lines with required fields**
    - Generate arbitrary `LogEntry` objects
    - Verify output is valid JSON with all required fields, task_description max 200 chars, error_output max 10,000 chars and only present when exit_code != 0
    - **Validates: Requirements 9.1, 9.3, 9.4**

  - [ ]* 9.3 Write unit tests for `logger.ts`
    - Test JSON Lines format correctness
    - Test log rotation at 10MB boundary
    - Test filesystem error handling (warn to stderr, don't throw)
    - Test truncation of task description and error output
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 10. Git state module
  - [ ] 10.1 Implement `src/server/rayu/git-state.ts`
    - Implement `isGitRepo(dir): Promise<boolean>` using `git rev-parse --is-inside-work-tree`
    - Implement `capturePreState(workspaceDir): Promise<GitInfo | null>` that records HEAD hash and working tree status via `git status --porcelain`
    - Implement `captureDiff(workspaceDir, preHeadHash): Promise<string>` using `git diff`
    - Generate dirty warning if pre-existing uncommitted changes exist (count of changed files)
    - Return `null` gracefully if not a git repo
    - Use `child_process.execFile` for git commands
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 10.2 Write unit tests for `git-state.ts`
    - Mock `execFile` for git commands
    - Test `git status --porcelain` parsing for modified/added/deleted/untracked files
    - Test non-git-repo detection returns null
    - Test dirty warning generation with pre-existing changes
    - _Requirements: 10.1, 10.2, 10.4, 10.6_

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Main dispatcher integration
  - [ ] 12.1 Implement `src/server/rayu/index.ts` — the `dispatchTask()` entry point
    - Validate workspace directory exists and is a git repo (or skip git gracefully)
    - Verify workspace contains `package.json` with `"name": "liveflows"`
    - Load and validate configuration via `config.ts`
    - Enqueue via `WorkspaceQueue`
    - Within the queued executor:
      - Take file snapshot before execution
      - Capture git pre-state
      - Read AGENTS.md if present, read referenced files, build context
      - Format instruction text via `instruction-builder.ts`
      - Spawn process via `process-runner.ts` with working dir, env, stdin
      - Take file snapshot after execution
      - Diff snapshots to detect file changes
      - Detect unauthorized changes against permitted file list
      - Capture git diff
      - Run `pnpm lint` if available and include lint errors
      - Assemble full `TaskResult`
      - Append execution log
      - Return `DispatchResult`
    - Handle all error codes: BINARY_NOT_FOUND, STARTUP_TIMEOUT, STDIN_WRITE_FAILED, WORKSPACE_INVALID, CONFIG_INVALID, QUEUE_FULL, PROCESS_UNKILLABLE
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

  - [ ]* 12.2 Write integration tests with a dummy binary
    - Create a shell script dummy binary that reads stdin and echoes to stdout
    - Test full dispatch cycle: instruction → spawn → collect → structured result
    - Test actual file change detection in a temp workspace
    - Test git state capture in a temp git repo
    - Test timeout with a sleep-based dummy binary
    - Test non-zero exit with a failing dummy binary
    - _Requirements: 1.1, 3.1, 3.3, 3.4, 3.6, 10.1, 10.2_

- [ ] 13. Final checkpoint - Ensure all tests pass and lint clean
  - Run `pnpm test -- src/server/rayu/` to verify all tests pass
  - Run `pnpm lint` to verify no lint errors
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 12 universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- The integration test (12.2) uses a real shell script as a dummy binary to test the full dispatch cycle end-to-end
- **No new runtime dependencies** — only `fast-check` as a devDependency for property-based testing
- **Test runner:** Vitest (project standard) — `pnpm test -- src/server/rayu/`
- All modules under `src/server/rayu/` are server-only; no React or client imports

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["2.1", "3.1", "5.1", "8.1", "9.1", "10.1"] },
    { "id": 3, "tasks": ["2.2", "2.3", "2.4", "3.2", "3.3", "3.4", "3.5", "3.6", "5.2", "5.3", "5.4", "6.1", "8.2", "8.3", "9.2", "9.3", "10.2"] },
    { "id": 4, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 5, "tasks": ["12.1"] },
    { "id": 6, "tasks": ["12.2"] }
  ]
}
```
