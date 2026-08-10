import fs from "fs/promises";
import path from "path";

export interface RayuConfig {
  binaryPath: string;
  timeoutSeconds: number;
  maxOutputBytes: number;
  cliFlags: string[];
  maxContextBytes: number;
}

export type RayuConfigFile = Partial<RayuConfig>;

export type ConfigResult =
  | { ok: true; config: RayuConfig }
  | { ok: false; error: string };

const DEFAULT_CONFIG: RayuConfig = {
  binaryPath: "rayu",
  timeoutSeconds: 300,
  maxOutputBytes: 102400,
  cliFlags: [],
  maxContextBytes: 51200,
};

export async function loadConfig(workspaceDir: string): Promise<ConfigResult> {
  const configPath = path.join(workspaceDir, ".kiro", "rayu-config.json");
  let fileConfig: RayuConfigFile = {};

  try {
    const fileContent = await fs.readFile(configPath, "utf-8");
    try {
      fileConfig = JSON.parse(fileContent);
    } catch (e) {
      return { ok: false, error: "Invalid JSON in rayu-config.json" };
    }
  } catch (e: any) {
    if (e.code !== "ENOENT") {
      return { ok: false, error: `Failed to read config file: ${e.message}` };
    }
  }

  // Apply environment variable overrides first
  if (process.env.RAYU_BINARY_PATH !== undefined) {
    fileConfig.binaryPath = process.env.RAYU_BINARY_PATH;
  }
  if (process.env.RAYU_TIMEOUT !== undefined) {
    const parsed = parseInt(process.env.RAYU_TIMEOUT, 10);
    if (!isNaN(parsed)) {
      fileConfig.timeoutSeconds = parsed;
    }
  }
  if (process.env.RAYU_MAX_OUTPUT !== undefined) {
    const parsed = parseInt(process.env.RAYU_MAX_OUTPUT, 10);
    if (!isNaN(parsed)) {
      fileConfig.maxOutputBytes = parsed;
    }
  }
  if (process.env.RAYU_CLI_FLAGS !== undefined) {
    fileConfig.cliFlags = process.env.RAYU_CLI_FLAGS ? process.env.RAYU_CLI_FLAGS.split(",") : [];
  }

  // Resolve with defaults
  const config: RayuConfig = {
    binaryPath: fileConfig.binaryPath ?? DEFAULT_CONFIG.binaryPath,
    timeoutSeconds: fileConfig.timeoutSeconds ?? DEFAULT_CONFIG.timeoutSeconds,
    maxOutputBytes: fileConfig.maxOutputBytes ?? DEFAULT_CONFIG.maxOutputBytes,
    cliFlags: fileConfig.cliFlags ?? DEFAULT_CONFIG.cliFlags,
    maxContextBytes: fileConfig.maxContextBytes ?? DEFAULT_CONFIG.maxContextBytes,
  };

  // Validate
  if (typeof config.binaryPath !== "string" || config.binaryPath.trim() === "") {
    return { ok: false, error: "binaryPath must be a non-empty string" };
  }

  if (typeof config.timeoutSeconds !== "number" || config.timeoutSeconds < 30 || config.timeoutSeconds > 3600) {
    return { ok: false, error: "timeoutSeconds must be between 30 and 3600" };
  }

  if (typeof config.maxOutputBytes !== "number" || config.maxOutputBytes < 1024 || config.maxOutputBytes > 10485760) {
    return { ok: false, error: "maxOutputBytes must be between 1024 and 10485760" };
  }
  
  if (typeof config.maxContextBytes !== "number" || config.maxContextBytes < 1024 || config.maxContextBytes > 1048576) {
    return { ok: false, error: "maxContextBytes must be between 1024 and 1048576" };
  }

  if (!Array.isArray(config.cliFlags) || config.cliFlags.length > 20) {
    return { ok: false, error: "cliFlags must be an array with max 20 items" };
  }
  
  for (const flag of config.cliFlags) {
    if (typeof flag !== "string" || flag.trim() === "") {
      return { ok: false, error: "cliFlags entries must be non-empty strings" };
    }
  }

  return { ok: true, config };
}
