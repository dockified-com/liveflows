import fs from 'fs/promises';
import path from 'path';
import { loadConfig } from './config';
import { validateInstruction, buildInstructionText, isCreationTask } from './instruction-builder';
import { enqueueTask } from './queue';
import { takeSnapshot, diffSnapshots, findUnauthorized } from './file-snapshot';
import { captureGitState, captureGitDiff } from './git-state';
import { runProcess, classifyFailure, DispatchError } from './process-runner';
import { appendLog } from './logger';
import type { DispatchOptions, DispatchResult, TaskResult } from './types';


export async function dispatchTask(options: DispatchOptions): Promise<DispatchResult> {
  return enqueueTask(options.workspaceDir, async (): Promise<DispatchResult> => {
    try {
      // 1. Validate workspace
      try {
        const pkgStr = await fs.readFile(path.join(options.workspaceDir, 'package.json'), 'utf-8');
        const pkg = JSON.parse(pkgStr);
        if (pkg.name !== 'liveflows') {
          return { ok: false, error: { code: 'WORKSPACE_INVALID', message: 'Workspace package.json name must be liveflows' } };
        }
        try {
          const gitStat = await fs.stat(path.join(options.workspaceDir, '.git'));
          if (!gitStat.isDirectory()) throw new Error();
        } catch {
          return { ok: false, error: { code: 'WORKSPACE_INVALID', message: 'Workspace is not a valid git repository' } };
        }
      } catch (e: any) {
        return { ok: false, error: { code: 'WORKSPACE_INVALID', message: 'Workspace invalid: ' + e.message } };
      }

      // 2. Load and validate config
      const configRes = await loadConfig(options.workspaceDir);
      if (!configRes.ok) {
         return { ok: false, error: { code: 'CONFIG_INVALID', message: configRes.error } };
      }
      const config = configRes.config;

      // 3. Build Instruction text
      // Read AGENTS.md if present
      let agentsMdContent: string | null = null;
      try {
        agentsMdContent = await fs.readFile(path.join(options.workspaceDir, 'AGENTS.md'), 'utf-8');
      } catch (e) {
        // ignore
      }

      const fileContents = new Map<string, string>();
      const missingFiles: string[] = [];
      for (const file of options.instruction.contextFiles) {
        try {
          const content = await fs.readFile(path.join(options.workspaceDir, file), 'utf-8');
          fileContents.set(file, content);
        } catch (e) {
          missingFiles.push(file);
        }
      }

      let directoryTree: string | null = null;
      if (isCreationTask(options.instruction.description)) {
        directoryTree = await buildDirectoryTree(options.workspaceDir, 0);
      }

      const validation = validateInstruction(options.instruction);
      if (!validation.valid) {
        return { ok: false, error: { code: 'CONFIG_INVALID', message: validation.error! } };
      }

      const stdinContent = buildInstructionText({
        instruction: options.instruction,
        agentsMdContent,
        fileContents,
        missingFiles,
        directoryTree,
        maxContextBytes: config.maxContextBytes
      });

      // 4. Pre-state captures
      const preGitState = await captureGitState(options.workspaceDir);
      const preSnapshot = await takeSnapshot(options.workspaceDir);

      // 5. Run process
      const timeoutMs = (options.timeoutSeconds ?? config.timeoutSeconds) * 1000;
      let runResult;
      try {
         runResult = await runProcess({
           binaryPath: config.binaryPath,
           cliFlags: config.cliFlags,
           workingDir: options.workspaceDir,
           stdinContent,
           timeoutMs,
           maxOutputBytes: config.maxOutputBytes,
           env: { ...process.env, ...options.instruction.envOverrides }
         });
      } catch (e: any) {
         if (e instanceof DispatchError) {
            return { ok: false, error: { code: e.code as any, message: e.message } };
         }
         throw e;
      }

      // 6. Post-state captures
      const postSnapshot = await takeSnapshot(options.workspaceDir);
      const filesChanged = diffSnapshots(preSnapshot, postSnapshot);
      const unauthorizedChanges = findUnauthorized(filesChanged, options.instruction.permittedFiles);

      let diff = "";
      if (preGitState) {
         const gitDiff = await captureGitDiff(options.workspaceDir);
         diff = gitDiff ?? "";
      }

      // 7. Write log entry
      const logEntry = {
        timestamp: new Date().toISOString(),
        taskDescription: options.instruction.description.substring(0, 200),
        exitCode: runResult.exitCode,
        durationMs: runResult.durationMs,
        filesChanged: filesChanged.map(f => f.path),
        ...(runResult.exitCode !== 0 ? { errorOutput: runResult.stderr.substring(0, 10000) } : {})
      };

      try {
         await appendLog(path.join(options.workspaceDir, '.kiro/logs'), logEntry);
      } catch (e) {
         // ignore logging failures
      }

      // 8. Return result
      const taskResult: TaskResult = {
        exitCode: runResult.exitCode,
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        durationMs: runResult.durationMs,
        truncated: runResult.truncated,
        failureClass: classifyFailure(runResult.exitCode),
        filesChanged,
        unauthorizedChanges,
        gitInfo: preGitState ? {
          preHeadHash: preGitState.hash,
          preWorkingTree: parseGitStatus(preGitState.status),
          diff,
          dirtyWarning: preGitState.status ? 'Working tree was dirty' : null
        } : null,
        lintErrors: null // Not implementing lint execution in this brief
      };

      return { ok: true, result: taskResult };

    } catch (error: any) {
      if (error instanceof DispatchError) {
         return { ok: false, error: { code: error.code as any, message: error.message } };
      }
      return { ok: false, error: { code: 'WORKSPACE_INVALID', message: error.message || 'Unknown error' } };
    }
  });
}

async function buildDirectoryTree(dir: string, depth = 0): Promise<string> {
  if (depth > 1) return '';
  let result = '';
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const ignored = new Set(['node_modules', '.git', '.next']);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (ignored.has(entry.name)) continue;
      const indent = '  '.repeat(depth);
      result += `${indent}${entry.name}\n`;
      if (entry.isDirectory()) {
        result += await buildDirectoryTree(path.join(dir, entry.name), depth + 1);
      }
    }
  } catch (e) {}
  return result;
}

function parseGitStatus(statusStr: string | null) {
  if (!statusStr) return [];
  const lines = statusStr.trim().split('\n');
  const result: any[] = [];
  for (const line of lines) {
    if (!line) continue;
    const code = line.substring(0, 2);
    const file = line.substring(3).trim();
    let status = 'modified';
    if (code === '??') status = 'untracked';
    else if (code.includes('A')) status = 'added';
    else if (code.includes('D')) status = 'deleted';
    result.push({ path: file, status });
  }
  return result;
}
