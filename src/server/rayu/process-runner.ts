import { spawn } from 'child_process';
import type { ChildProcess } from 'child_process';

export interface RunOptions {
  binaryPath: string;
  cliFlags: string[];
  workingDir: string;
  stdinContent: string;
  timeoutMs: number;
  maxOutputBytes: number;
  env: NodeJS.ProcessEnv;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
  truncated: { stdout: boolean; stderr: boolean };
  timedOut: boolean;
  unkillable: boolean;
}

export function truncateOutput(content: Buffer, maxBytes: number): { text: string, truncated: boolean } {
  if (content.length <= maxBytes) {
    return { text: content.toString('utf8'), truncated: false };
  }
  const marker = `[TRUNCATED] Original size: ${content.length} bytes\n`;
  const keptBytes = content.subarray(content.length - maxBytes);
  return { text: marker + keptBytes.toString('utf8'), truncated: true };
}

export function classifyFailure(exitCode: number): "retriable" | "non-retriable" | null {
  if (exitCode === 0) return null;
  if (exitCode === 126 || exitCode === 127) return "non-retriable";
  return "retriable";
}

export class DispatchError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DispatchError';
  }
}

export function runProcess(options: RunOptions): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    let durationMs = 0;
    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    
    let timedOut = false;
    let unkillable = false;
    let resolved = false;

    let child: ChildProcess | undefined;

    const startupTimeoutTimer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (child) child.kill('SIGKILL');
        reject(new DispatchError('STARTUP_TIMEOUT', 'Process startup timed out'));
      }
    }, 10000);

    try {
      child = spawn(options.binaryPath, options.cliFlags, {
        cwd: options.workingDir,
        env: options.env,
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (e: any) {
      clearTimeout(startupTimeoutTimer);
      resolved = true;
      reject(new DispatchError('BINARY_NOT_FOUND', `Failed to spawn: ${e.message}`));
      return;
    }

    let timeoutTimer: NodeJS.Timeout;
    let sigkillTimer: NodeJS.Timeout;
    let unkillableTimer: NodeJS.Timeout;

    const cleanupTimers = () => {
      clearTimeout(startupTimeoutTimer);
      clearTimeout(timeoutTimer);
      clearTimeout(sigkillTimer);
      clearTimeout(unkillableTimer);
    };

    child.on('spawn', () => {
      clearTimeout(startupTimeoutTimer);
      
      timeoutTimer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        
        sigkillTimer = setTimeout(() => {
          child.kill('SIGKILL');
          
          unkillableTimer = setTimeout(() => {
            unkillable = true;
            if (!resolved) {
              resolved = true;
              reject(new DispatchError('PROCESS_UNKILLABLE', 'Process could not be killed'));
            }
          }, 5000);
        }, 5000);
      }, options.timeoutMs);

      child!.stdin?.on('error', (e: any) => {
        cleanupTimers();
        if (!resolved) {
          resolved = true;
          child!.kill('SIGKILL');
          reject(new DispatchError('STDIN_WRITE_FAILED', `Failed to write stdin: ${e.message}`));
        }
      });

      try {
        if (options.stdinContent) {
          child!.stdin?.write(options.stdinContent);
        }
        child!.stdin?.end();
      } catch (e: any) {
        cleanupTimers();
        if (!resolved) {
          resolved = true;
          child!.kill('SIGKILL');
          reject(new DispatchError('STDIN_WRITE_FAILED', `Failed to write stdin: ${e.message}`));
        }
      }
    });

    child.on('error', (err: any) => {
      cleanupTimers();
      if (!resolved) {
        resolved = true;
        if (err.code === 'ENOENT') {
          reject(new DispatchError('BINARY_NOT_FOUND', `Binary not found: ${options.binaryPath}`));
        } else {
          reject(new DispatchError('SPAWN_ERROR', err.message));
        }
      }
    });

    let stdoutSize = 0;
    let stderrSize = 0;
    const threshold = 16384;
    child!.stdout?.on('data', (chunk) => {
      stdoutChunks.push(chunk);
      stdoutSize += chunk.length;
      while (stdoutSize - stdoutChunks[0].length >= options.maxOutputBytes + threshold) {
        stdoutSize -= stdoutChunks[0].length;
        stdoutChunks.shift();
      }
    });

    child!.stderr?.on('data', (chunk) => {
      stderrChunks.push(chunk);
      stderrSize += chunk.length;
      while (stderrSize - stderrChunks[0].length >= options.maxOutputBytes + threshold) {
        stderrSize -= stderrChunks[0].length;
        stderrChunks.shift();
      }
    });

    child!.on('close', (code, signal) => {
      cleanupTimers();
      if (resolved) return;
      resolved = true;
      durationMs = Date.now() - startTime;
      
      let exitCode = code ?? (signal ? -1 : 0);
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        exitCode = -1;
      }

      const stdoutBuf = Buffer.concat(stdoutChunks);
      const stderrBuf = Buffer.concat(stderrChunks);

      const out = truncateOutput(stdoutBuf, options.maxOutputBytes);
      const err = truncateOutput(stderrBuf, options.maxOutputBytes);

      resolve({
        exitCode,
        stdout: out.text,
        stderr: err.text,
        durationMs,
        truncated: {
          stdout: out.truncated,
          stderr: err.truncated
        },
        timedOut,
        unkillable
      });
    });
  });
}
