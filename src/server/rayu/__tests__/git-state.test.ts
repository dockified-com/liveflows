import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as childProcess from 'child_process';
import { captureGitState, captureGitDiff } from '../git-state';

vi.mock('child_process', () => {
  return {
    execFile: vi.fn(),
  };
});

describe('git-state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('captureGitState', () => {
    it('returns hash and status on success', async () => {
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        if (args[0] === 'rev-parse') {
          (callback as any)(null, 'abcdef1234567890\n', '');
        } else if (args[0] === 'status') {
          (callback as any)(null, ' M some-file.ts\n', '');
        }
        return {} as any;
      });

      const result = await captureGitState('/test/dir');
      expect(result).toEqual({ hash: 'abcdef1234567890', status: 'M some-file.ts' });
    });

    it('returns null on failure (e.g. not a repo)', async () => {
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        (callback as any)(new Error('Command failed'), '', 'fatal: not a git repository');
        return {} as any;
      });

      const result = await captureGitState('/test/dir');
      expect(result).toBeNull();
    });

    it('returns null on timeout', async () => {
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        const error: any = new Error('Command failed');
        error.killed = true;
        (callback as any)(error, '', '');
        return {} as any;
      });

      const result = await captureGitState('/test/dir');
      expect(result).toBeNull();
    });
  });

  describe('captureGitDiff', () => {
    it('returns diff string on success', async () => {
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        (callback as any)(null, 'diff --git a/file b/file\n', '');
        return {} as any;
      });

      const result = await captureGitDiff('/test/dir');
      expect(result).toBe('diff --git a/file b/file\n');
    });

    it('returns null on failure', async () => {
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        (callback as any)(new Error('failed'), '', '');
        return {} as any;
      });

      const result = await captureGitDiff('/test/dir');
      expect(result).toBeNull();
    });

    it('truncates output to 100KB', async () => {
      const largeDiff = Buffer.alloc(150 * 1024, 'a').toString('utf-8');
      
      vi.mocked(childProcess.execFile).mockImplementation((cmd, args, options, callback) => {
        (callback as any)(null, largeDiff, '');
        return {} as any;
      });

      const result = await captureGitDiff('/test/dir');
      expect(result?.length).toBe(100 * 1024);
    });
  });
});
