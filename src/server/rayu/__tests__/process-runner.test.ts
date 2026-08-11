import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { 
  runProcess, 
  truncateOutput, 
  classifyFailure,
  DispatchError
} from '../process-runner';
import { EventEmitter } from 'events';
import child_process from 'child_process';

vi.mock('child_process');

describe('process-runner', () => {
  describe('Property 5: Output truncation', () => {
    it('preserves the last N bytes and prepends a marker if exceeding max', () => {
      fc.assert(
        fc.property(
          fc.string({ maxLength: 500000 }), // up to 500KB
          fc.integer({ min: 1, max: 1000000 }),
          (str, maxBytes) => {
            const buf = Buffer.from(str, 'utf8');
            const result = truncateOutput(buf, maxBytes);
            
            if (buf.length > maxBytes) {
              expect(result.truncated).toBe(true);
              const markerRegex = /\[TRUNCATED\] Original size: \d+ bytes\n/;
              expect(result.text).toMatch(markerRegex);
              
              const marker = `[TRUNCATED] Original size: ${buf.length} bytes\n`;
              expect(result.text.startsWith(marker)).toBe(true);
              
              const keptBytes = buf.subarray(buf.length - maxBytes);
              expect(result.text.endsWith(keptBytes.toString('utf8'))).toBe(true);
            } else {
              expect(result.truncated).toBe(false);
              expect(result.text).toBe(buf.toString('utf8'));
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 6: Failure classification', () => {
    it('is deterministic and total', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 1000 }),
          (code) => {
            const cls = classifyFailure(code);
            if (code === 0) {
              expect(cls).toBeNull();
            } else if (code === 126 || code === 127) {
              expect(cls).toBe('non-retriable');
            } else {
              expect(cls).toBe('retriable');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('runProcess unit tests', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('handles successful execution', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();
      
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'rayu',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: 'test input',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      mockChild.emit('spawn');
      mockChild.stdout.emit('data', Buffer.from('hello'));
      mockChild.emit('close', 0, null);
      
      const result = await promise;
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toBe('hello');
      expect(mockChild.stdin.write).toHaveBeenCalledWith('test input');
      expect(mockChild.stdin.end).toHaveBeenCalled();
    });

    it('handles binary not found', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.kill = vi.fn();
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'missing-bin',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: '',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      mockChild.emit('error', { code: 'ENOENT', message: 'spawn ENOENT' });
      
      await expect(promise).rejects.toThrow(DispatchError);
      await expect(promise).rejects.toMatchObject({ code: 'BINARY_NOT_FOUND' });
    });

    it('handles startup timeout', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.kill = vi.fn();
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'rayu',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: '',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      vi.advanceTimersByTime(10000);
      
      await expect(promise).rejects.toThrow(DispatchError);
      await expect(promise).rejects.toMatchObject({ code: 'STARTUP_TIMEOUT' });
    });

    it('handles timeout sequence (SIGTERM -> SIGKILL -> unkillable)', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();
      
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'rayu',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: '',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      mockChild.emit('spawn');
      
      // Advance by timeout (SIGTERM)
      vi.advanceTimersByTime(5000);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      
      // Advance by 5s grace (SIGKILL)
      vi.advanceTimersByTime(5000);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
      
      // Advance by 5s unkillable
      vi.advanceTimersByTime(5000);
      
      await expect(promise).rejects.toMatchObject({ code: 'PROCESS_UNKILLABLE' });
    });

    it('handles stdin write failure', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdin = { 
        write: vi.fn().mockImplementation(() => { throw new Error('EPIPE'); }), 
        end: vi.fn(),
        on: vi.fn()
      };
      mockChild.kill = vi.fn();
      
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'rayu',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: 'data',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      mockChild.emit('spawn');
      
      await expect(promise).rejects.toMatchObject({ code: 'STDIN_WRITE_FAILED' });
      expect(mockChild.kill).toHaveBeenCalledWith('SIGKILL');
    });
  });

  describe('Additional runProcess tests', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
    });

    it('handles successful exit during SIGTERM grace period', async () => {
      const mockChild = new EventEmitter() as any;
      mockChild.stdin = { write: vi.fn(), end: vi.fn(), on: vi.fn() };
      mockChild.stdout = new EventEmitter();
      mockChild.stderr = new EventEmitter();
      mockChild.kill = vi.fn();
      
      vi.mocked(child_process.spawn).mockReturnValue(mockChild);
      
      const promise = runProcess({
        binaryPath: 'rayu',
        cliFlags: [],
        workingDir: '/tmp',
        stdinContent: '',
        timeoutMs: 5000,
        maxOutputBytes: 1000,
        env: {}
      });
      
      mockChild.emit('spawn');
      
      // Advance by timeout (SIGTERM)
      vi.advanceTimersByTime(5000);
      expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
      
      // Exit successfully during grace period
      mockChild.emit('close', null, 'SIGTERM');
      
      const result = await promise;
      expect(result.timedOut).toBe(true);
      expect(result.exitCode).toBe(-1);
    });
  });
});
