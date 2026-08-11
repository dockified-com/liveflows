import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export async function captureGitState(
  workspaceDir: string,
): Promise<{ hash: string; status: string } | null> {
  try {
    const { stdout: hashStdout } = await execFileAsync(
      "git",
      ["rev-parse", "HEAD"],
      {
        cwd: workspaceDir,
        timeout: 5000,
      },
    );
    const hash = hashStdout.trim();

    const { stdout: statusStdout } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      {
        cwd: workspaceDir,
        timeout: 5000,
      },
    );
    const status = statusStdout.trimEnd();

    return { hash, status };
  } catch (error) {
    return null;
  }
}

export async function captureGitDiff(
  workspaceDir: string,
): Promise<string | null> {
  let diffStdout = "";
  try {
    const { stdout } = await execFileAsync("git", ["diff", "HEAD"], {
      cwd: workspaceDir,
      timeout: 10000,
      maxBuffer: 10 * 1024 * 1024,
    });
    diffStdout = stdout;
  } catch (error: any) {
    if (
      error?.code === "ERR_CHILD_PROCESS_STDIO_MAXBUFFER" &&
      typeof error.stdout === "string"
    ) {
      diffStdout = error.stdout;
    } else {
      return null;
    }
  }

  // truncate to 100KB
  const MAX_BYTES = 100 * 1024;
  const diffBuffer = Buffer.from(diffStdout, "utf-8");
  if (diffBuffer.length > MAX_BYTES) {
    // to handle multibyte boundaries, convert to string which will handle the cutoff gracefully or add replacement char
    return diffBuffer.subarray(0, MAX_BYTES).toString("utf-8");
  }

  return diffStdout;
}
