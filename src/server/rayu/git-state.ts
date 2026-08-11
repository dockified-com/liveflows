import { execFile } from 'child_process';

function execFileAsync(cmd: string, args: string[], options: any): Promise<{ stdout: string, stderr: string }> {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, options, (error, stdout, stderr) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

export async function captureGitState(
  workspaceDir: string
): Promise<{ hash: string; status: string } | null> {
  try {
    const { stdout: hashStdout } = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: workspaceDir,
      timeout: 5000,
    });
    const hash = hashStdout.trim();

    const { stdout: statusStdout } = await execFileAsync('git', ['status', '--porcelain'], {
      cwd: workspaceDir,
      timeout: 5000,
    });
    const status = statusStdout.trim();

    return { hash, status };
  } catch (error) {
    return null;
  }
}

export async function captureGitDiff(
  workspaceDir: string
): Promise<string | null> {
  try {
    const { stdout: diffStdout } = await execFileAsync('git', ['diff', 'HEAD'], {
      cwd: workspaceDir,
      timeout: 10000,
      maxBuffer: 1024 * 1024, // 1MB buffer to prevent maxBuffer error before truncation
    });
    
    // truncate to 100KB
    const MAX_BYTES = 100 * 1024;
    const diffBuffer = Buffer.from(diffStdout, 'utf-8');
    if (diffBuffer.length > MAX_BYTES) {
      return diffBuffer.subarray(0, MAX_BYTES).toString('utf-8');
    }

    return diffStdout;
  } catch (error) {
    return null;
  }
}
