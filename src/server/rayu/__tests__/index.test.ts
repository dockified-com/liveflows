import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dispatchTask } from '../index';
import * as configModule from '../config';
import * as instructionBuilderModule from '../instruction-builder';
import * as fileSnapshotModule from '../file-snapshot';
import * as gitStateModule from '../git-state';
import * as processRunnerModule from '../process-runner';
import * as loggerModule from '../logger';
import { DispatchError } from '../process-runner';
import fs from 'fs/promises';

vi.mock('fs/promises');
vi.mock('../config');

vi.mock('../file-snapshot');
vi.mock('../git-state');
vi.mock('../process-runner', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual as any,
    runProcess: vi.fn(),
    classifyFailure: vi.fn(),
  };
});
vi.mock('../logger');

describe('dispatchTask', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    vi.spyOn(fs, 'stat').mockResolvedValue({ isDirectory: () => true } as any);
    vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({ name: 'liveflows' });
      }
      return 'fake content';
    });

    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      ok: true,
      config: {
        binaryPath: '/bin/rayu',
        timeoutSeconds: 300,
        maxOutputBytes: 1024,
        cliFlags: [],
        maxContextBytes: 1024
      }
    });

    vi.spyOn(fileSnapshotModule, 'takeSnapshot').mockResolvedValue(new Map());
    vi.spyOn(fileSnapshotModule, 'diffSnapshots').mockReturnValue([]);
    vi.spyOn(fileSnapshotModule, 'findUnauthorized').mockReturnValue([]);

    vi.spyOn(gitStateModule, 'captureGitState').mockResolvedValue({ hash: '123', status: '' });
    vi.spyOn(gitStateModule, 'captureGitDiff').mockResolvedValue('diff');

    vi.spyOn(processRunnerModule, 'runProcess').mockResolvedValue({
      exitCode: 0,
      stdout: 'ok',
      stderr: '',
      durationMs: 100,
      truncated: { stdout: false, stderr: false },
      timedOut: false,
      unkillable: false
    });
    vi.spyOn(processRunnerModule, 'classifyFailure').mockReturnValue(null);

    vi.spyOn(loggerModule, 'appendLog').mockResolvedValue(undefined);
  });

  const validInstruction = {
    description: 'Do a thing',
    contextFiles: ['a.txt'],
    constraints: ['no lint errors'],
    permittedFiles: ['b.txt'],
    expectedOutput: 'thing done'
  };

  it('runs happy path', async () => {
    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.exitCode).toBe(0);
      expect(result.result.filesChanged).toEqual([]);
      expect(loggerModule.appendLog).toHaveBeenCalled();
      expect(processRunnerModule.runProcess).toHaveBeenCalled();
    }
  });

  it('fails early if package.json is missing or wrong', async () => {
    vi.spyOn(fs, 'readFile').mockImplementation(async (filePath: any) => {
      if (filePath.endsWith('package.json')) {
        return JSON.stringify({ name: 'other' });
      }
      return '';
    });

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('WORKSPACE_INVALID');
    }
  });

  it('fails early if config invalid', async () => {
    vi.spyOn(configModule, 'loadConfig').mockResolvedValue({
      ok: false,
      error: 'bad config'
    });

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_INVALID');
    }
  });

  it('handles unauthorized changes correctly', async () => {
    vi.spyOn(fileSnapshotModule, 'findUnauthorized').mockReturnValue(['secret.txt']);

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.unauthorizedChanges).toEqual(['secret.txt']);
    }
  });

  it('classifies timeout properly', async () => {
    vi.spyOn(processRunnerModule, 'runProcess').mockResolvedValue({
      exitCode: -1,
      stdout: '',
      stderr: '',
      durationMs: 3000,
      truncated: { stdout: false, stderr: false },
      timedOut: true,
      unkillable: false
    });
    vi.spyOn(processRunnerModule, 'classifyFailure').mockReturnValue('retriable');

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.result.exitCode).toBe(-1);
      expect(result.result.failureClass).toBe('retriable');
      expect(loggerModule.appendLog).toHaveBeenCalled();
    }
  });

  it('fails if non-git workspace directory', async () => {
    vi.spyOn(fs, 'stat').mockRejectedValue(new Error('ENOENT'));

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('WORKSPACE_INVALID');
      expect(result.error.message).toContain('valid git repository');
    }
  });

  it('fails if instruction is invalid', async () => {
    const invalidInstruction = { ...validInstruction, description: '' };
    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: invalidInstruction
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('CONFIG_INVALID');
      expect(result.error.message).toContain('Missing or empty mandatory field');
    }
  });

  it('returns DispatchError if process runner throws it', async () => {
    vi.spyOn(processRunnerModule, 'runProcess').mockRejectedValue(
      new DispatchError('BINARY_NOT_FOUND', 'Binary missing')
    );

    const result = await dispatchTask({
      workspaceDir: '/work',
      instruction: validInstruction
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('BINARY_NOT_FOUND');
    }
  });
});
