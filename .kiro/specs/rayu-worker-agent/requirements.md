# Requirements Document

## Introduction

This document specifies the requirements for the Rayu Worker Agent feature, which enables Kiro (the orchestrating AI agent) to delegate coding tasks to "Rayu Code" — an external AI coding agent — by spawning it via CLI commands. Rayu Code acts as a sub-agent that receives coding instructions, executes them within the LiveFlows project workspace, and returns structured results back to Kiro for validation and further orchestration.

This feature transforms the development workflow from single-agent to multi-agent, where Kiro retains high-level planning and review responsibilities while Rayu handles the mechanical coding execution.

## Glossary

- **Kiro**: The primary orchestrating AI agent (this agent) responsible for planning, reviewing, and coordinating work
- **Rayu_Code**: An external AI coding agent invoked via CLI that executes coding tasks within a workspace
- **Task_Dispatcher**: The module responsible for formatting instructions, spawning the Rayu CLI process, and collecting results
- **Task_Instruction**: A structured object containing the coding task description, context files, constraints, and expected outputs
- **Task_Result**: A structured object returned by Rayu containing the outcome status, files modified, output logs, and any errors
- **CLI_Process**: An operating system child process spawned to run the Rayu Code binary
- **Session**: A single invocation of Rayu Code from spawn to exit, covering one or more related coding actions
- **Workspace**: The LiveFlows project root directory where Rayu Code operates on files
- **Timeout**: The maximum duration allowed for a single Rayu Code session before forced termination

## Requirements

### Requirement 1: CLI Process Spawning

**User Story:** As Kiro, I want to spawn Rayu Code as a child process via its CLI command, so that I can delegate coding work to it programmatically.

#### Acceptance Criteria

1. WHEN Kiro dispatches a coding task, THE Task_Dispatcher SHALL spawn a new CLI_Process executing the Rayu Code binary with a process start timeout of 10 seconds
2. THE Task_Dispatcher SHALL pass the task instruction to Rayu_Code via standard input as a structured text prompt containing the task description, and SHALL close the standard input stream after writing is complete
3. THE Task_Dispatcher SHALL set the working directory of the CLI_Process to the LiveFlows project workspace root as resolved from the repository directory containing the `package.json` with `"name": "liveflows"`
4. THE Task_Dispatcher SHALL inherit the current environment variables into the CLI_Process so that Rayu_Code has access to required API keys and configuration
5. IF the Rayu Code binary is not found at the configured path, THEN THE Task_Dispatcher SHALL return an error indicating the binary is unavailable, including the path that was searched
6. IF the CLI_Process fails to start within 10 seconds, THEN THE Task_Dispatcher SHALL terminate the spawn attempt and return an error indicating a process startup timeout
7. IF the standard input write to the CLI_Process fails, THEN THE Task_Dispatcher SHALL terminate the CLI_Process and return an error indicating the task instruction could not be delivered

### Requirement 2: Task Instruction Formatting

**User Story:** As Kiro, I want to send well-structured instructions to Rayu Code, so that it has sufficient context to complete the coding task correctly.

#### Acceptance Criteria

1. THE Task_Dispatcher SHALL format each task instruction to include the following sections: a task description summarizing the objective in one or more sentences, a list of relevant file paths for context, a constraints section listing rules the agent must follow, and an expected output section specifying what files or artifacts the agent must produce
2. WHEN the task involves files governed by conventions defined in AGENTS.md, THE Task_Instruction SHALL include the applicable convention excerpts from AGENTS.md in the constraints section
3. THE Task_Instruction SHALL specify an explicit allowlist of file paths that Rayu_Code is permitted to create or modify, containing at least one entry and no more than 50 entries per task instruction
4. WHEN a task references existing code files, THE Task_Dispatcher SHALL include the full content of each referenced file in the instruction context, up to a maximum of 10 files and 200KB total content size per instruction
5. IF a referenced file exceeds 50KB or the total included content exceeds 200KB, THEN THE Task_Dispatcher SHALL include only the relevant sections of those files with line-range indicators rather than full content
6. THE Task_Instruction format SHALL use plain text with named section headers delimited by markdown heading markers (##) for each section, such that any LLM-based agent can parse individual sections by splitting on the delimiter pattern
7. WHEN the Task_Dispatcher produces a Task_Instruction, THE Task_Instruction SHALL contain all mandatory sections (task description, file paths, constraints, permitted files, expected output) and SHALL be rejected by validation if any mandatory section is empty or absent

### Requirement 3: Result Collection and Parsing

**User Story:** As Kiro, I want to receive structured results from Rayu Code after task completion, so that I can verify the work and proceed with the next step.

#### Acceptance Criteria

1. WHEN the CLI_Process exits with code 0, THE Task_Dispatcher SHALL capture the complete standard output content as the Task_Result stdout field
2. WHEN the CLI_Process exits with a non-zero code, THE Task_Dispatcher SHALL capture both standard output and standard error streams as the error result and preserve the exit code
3. WHEN the CLI_Process completes, THE Task_Dispatcher SHALL detect which files were created or modified by comparing a snapshot of file paths and last-modified timestamps in the workspace taken before execution against the state after execution
4. THE Task_Result SHALL include: the integer exit code, captured stdout as a string, captured stderr as a string, a list of file paths that were created or modified, and the execution duration in milliseconds measured from process spawn to process exit
5. IF the captured stdout or stderr exceeds 100KB, THEN THE Task_Dispatcher SHALL truncate the content to the last 100KB, prepend a marker indicating that the output was truncated and the original size in bytes
6. IF the CLI_Process has not exited within 300 seconds of being spawned, THEN THE Task_Dispatcher SHALL terminate the process, capture any partial output produced so far, and record the Task_Result with an exit code of -1 and an error message indicating a timeout after 300 seconds
7. WHEN the CLI_Process exits, THE Task_Dispatcher SHALL make the complete Task_Result available to the caller within 2 seconds of process exit

### Requirement 4: Timeout and Resource Management

**User Story:** As a system operator, I want Rayu Code sessions to be bounded in duration and resources, so that a hung or runaway process does not block the workflow.

#### Acceptance Criteria

1. THE Task_Dispatcher SHALL enforce a configurable timeout on each CLI_Process session, with the timeout value bounded between 30 seconds and 3600 seconds inclusive, defaulting to 300 seconds
2. WHEN a CLI_Process exceeds the timeout, THE Task_Dispatcher SHALL terminate the process with SIGTERM followed by SIGKILL after a 5-second grace period
3. IF a timeout termination occurs, THEN THE Task_Dispatcher SHALL return a result indicating the task was terminated due to timeout, including any output produced by the CLI_Process up to the point of termination
4. IF the CLI_Process does not terminate within 5 seconds of SIGKILL, THEN THE Task_Dispatcher SHALL mark the task as failed with an error indicating the process could not be terminated
5. THE Task_Dispatcher SHALL allow only one Rayu_Code CLI_Process to run at a time per workspace to prevent file conflicts
6. WHEN a new task is dispatched while another CLI_Process is running in the same workspace, THE Task_Dispatcher SHALL queue the new task up to a maximum queue depth of 10 tasks
7. IF a new task is dispatched and the queue for that workspace has reached 10 pending tasks, THEN THE Task_Dispatcher SHALL reject the task with an error indicating the workspace queue is full

### Requirement 5: Error Handling and Retry

**User Story:** As Kiro, I want to handle failures from Rayu Code gracefully, so that I can retry, adjust instructions, or fall back to manual implementation.

#### Acceptance Criteria

1. WHEN Rayu_Code exits with a non-zero exit code, THE Task_Dispatcher SHALL return a structured result containing the exit code, a failure classification of either "retriable" or "non-retriable", and the captured error output
2. IF Rayu_Code exits with code 124 (timeout) or code 137 (killed), THEN THE Task_Dispatcher SHALL classify the failure as "retriable"
3. IF Rayu_Code exits with code 126 (permission denied / cannot execute) or code 127 (binary not found), THEN THE Task_Dispatcher SHALL classify the failure as "non-retriable"
4. IF Rayu_Code exits with a non-zero code not explicitly listed in criteria 2 or 3, THEN THE Task_Dispatcher SHALL classify the failure as "retriable"
5. THE Task_Dispatcher SHALL capture both stdout and stderr from the failed Rayu_Code process, truncating each stream independently to a maximum of 50,000 characters while retaining the final 50,000 characters of each stream
6. THE Task_Dispatcher SHALL NOT automatically retry a failed task; retry decisions remain with Kiro

### Requirement 6: Workspace Safety

**User Story:** As a developer, I want Rayu Code to be constrained to safe operations within the project, so that it cannot accidentally damage the workspace or external systems.

#### Acceptance Criteria

1. WHEN the Task_Dispatcher receives a task for execution, THE Task_Dispatcher SHALL verify that the workspace directory exists and is a valid git repository before spawning Rayu_Code
2. IF the workspace directory does not exist or is not a valid git repository, THEN THE Task_Dispatcher SHALL reject the task with an error message indicating the workspace validation failure and SHALL NOT spawn Rayu_Code
3. THE Task_Instruction SHALL contain a list of one or more file paths, relative to the workspace root, that Rayu_Code is authorized to modify, with a maximum of 50 file paths per task
4. WHEN Rayu_Code execution completes, THE Task_Dispatcher SHALL compare the set of files modified during execution against the authorized file list and SHALL include in the Task_Result a warning entry for each file modified outside the authorized set, identifying the unauthorized file path
5. THE Task_Dispatcher SHALL NOT pass environment variables, API keys, or access tokens to Rayu_Code beyond those explicitly declared as required in the Task_Instruction for the specific task
6. THE Task_Instruction SHALL NOT grant Rayu_Code the ability to make outbound network requests or execute commands that modify systems external to the workspace directory
7. IF Rayu_Code modifies files and the workspace defines a lint command (pnpm lint), THEN THE Task_Result SHALL include any lint errors produced, associated with the file paths that triggered them

### Requirement 7: Configuration Management

**User Story:** As a developer, I want to configure how Rayu Code is invoked, so that I can adapt to different environments and Rayu versions.

#### Acceptance Criteria

1. THE Task_Dispatcher SHALL read its configuration from a file located at `.kiro/rayu-config.json` relative to the project root directory
2. THE Configuration SHALL specify: the path to the Rayu Code binary, default timeout in seconds (integer, range 1 to 3600), maximum output size in bytes (integer, range 1024 to 10485760), and an array of additional CLI flags (each flag a non-empty string, maximum 20 flags)
3. WHEN the configuration file does not exist at the expected path, THE Task_Dispatcher SHALL use default values: binary name `rayu` resolved via the system PATH, timeout of 300 seconds, and maximum output size of 102400 bytes
4. THE Configuration SHALL support environment variable overrides where each environment variable takes precedence over the corresponding configuration file value, using the naming convention `RAYU_BINARY_PATH`, `RAYU_TIMEOUT`, `RAYU_MAX_OUTPUT`, and `RAYU_CLI_FLAGS` (comma-separated list for flags)
5. IF the configuration file contains invalid JSON syntax, THEN THE Task_Dispatcher SHALL return a validation error indicating the file could not be parsed, without starting task dispatch
6. IF the configuration file contains values outside their permitted ranges or of incorrect types, THEN THE Task_Dispatcher SHALL return a validation error identifying which field failed validation and the constraint that was violated, without starting task dispatch
7. IF an environment variable override contains a value outside its permitted range or of incorrect type, THEN THE Task_Dispatcher SHALL return a validation error identifying which environment variable failed validation and the constraint that was violated, without starting task dispatch

### Requirement 8: Task Context Injection

**User Story:** As Kiro, I want to provide Rayu Code with relevant project context automatically, so that it produces code consistent with the project's conventions.

#### Acceptance Criteria

1. WHEN a task instruction is dispatched and AGENTS.md exists in the project root, THE Task_Dispatcher SHALL include the full content of AGENTS.md as the first context section in the instruction
2. IF AGENTS.md does not exist in the project root, THEN THE Task_Dispatcher SHALL proceed with task dispatch without project-convention context and without error
3. WHEN file paths appear in the task description (matching patterns such as quoted paths, paths with file extensions, or import references), THE Task_Dispatcher SHALL read each referenced file that exists on disk and include its content in the instruction
4. IF a file path referenced in the task does not exist on disk, THEN THE Task_Dispatcher SHALL omit that file from the context and include a note in the instruction indicating the file was not found
5. WHEN the task description contains keywords indicating file creation (such as "create", "add", "new file", or "generate" followed by a file path or name), THE Task_Dispatcher SHALL include the project directory structure up to 2 levels deep from the project root in the instruction
6. THE Task_Dispatcher SHALL measure total injected context size in bytes of UTF-8 encoded text and enforce a configurable maximum (default: 51,200 bytes)
7. IF the combined context (AGENTS.md content, referenced file contents, and directory structure) exceeds the configured maximum size, THEN THE Task_Dispatcher SHALL include items in priority order—AGENTS.md first, then referenced files in the order they appear in the task, then directory structure—truncating the lowest-priority item at the byte boundary or omitting it entirely if no portion fits within the remaining budget

### Requirement 9: Execution Logging

**User Story:** As a developer, I want a log of all Rayu Code invocations, so that I can audit what was delegated and debug issues.

#### Acceptance Criteria

1. WHEN an invocation completes, THE Task_Dispatcher SHALL append a log entry containing: ISO 8601 timestamp with timezone offset, task description truncated to the first 200 characters, exit code as an integer, duration in whole milliseconds, and a list of zero or more file paths that were created or modified during the invocation
2. THE Execution logs SHALL be written to a file at `.kiro/logs/rayu-sessions.log`
3. THE Log entries SHALL be formatted as one JSON object per line (JSON Lines format) with consistent field names across all entries
4. WHEN an invocation exits with a non-zero exit code, THE Task_Dispatcher SHALL include in the log entry an `error_output` field containing the stderr output truncated to the last 10,000 characters
5. WHEN the log file size exceeds 10MB before a new entry is appended, THE Task_Dispatcher SHALL rename the existing file to `rayu-sessions.log.1` (overwriting any previous backup) and begin writing to a new empty `rayu-sessions.log`
6. IF the log file cannot be written due to a filesystem error, THEN THE Task_Dispatcher SHALL emit a warning to stderr and continue the invocation without blocking execution

### Requirement 10: Git Integration

**User Story:** As Kiro, I want to verify the git state before and after Rayu Code execution, so that I can track exactly what changed and revert if needed.

#### Acceptance Criteria

1. BEFORE spawning Rayu_Code, THE Task_Dispatcher SHALL record the current git HEAD commit hash and working tree status as a list of uncommitted file paths with their status (modified, added, deleted, untracked)
2. AFTER Rayu_Code completes, THE Task_Dispatcher SHALL compute a unified git diff of all changes relative to the HEAD commit hash recorded before dispatch
3. THE Task_Result SHALL include the git diff output, the pre-dispatch HEAD hash, and the pre-dispatch working tree status
4. IF the working tree had uncommitted changes (staged or unstaged) before dispatch, THE Task_Dispatcher SHALL warn Kiro that pre-existing changes may mix with Rayu's output, including the count of pre-existing changed files
5. THE Task_Dispatcher SHALL NOT commit, stage, or modify the git index automatically; commit decisions remain with Kiro
6. IF the working directory is not a git repository, THEN THE Task_Dispatcher SHALL skip git state recording and include a note in the Task_Result indicating that git integration is unavailable
