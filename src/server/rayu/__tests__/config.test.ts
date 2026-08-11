import fc from "fast-check";
import fs from "fs/promises";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig } from "../config";

vi.mock("fs/promises");

describe("Configuration module", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.RAYU_BINARY_PATH;
    delete process.env.RAYU_TIMEOUT;
    delete process.env.RAYU_MAX_OUTPUT;
    delete process.env.RAYU_CLI_FLAGS;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns default config when file does not exist", async () => {
    vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });
    const result = await loadConfig("/dummy");
    expect(result).toEqual({
      ok: true,
      config: {
        binaryPath: "rayu",
        timeoutSeconds: 300,
        maxOutputBytes: 102400,
        cliFlags: [],
        maxContextBytes: 51200,
      },
    });
  });

  it("returns invalid JSON error", async () => {
    vi.mocked(fs.readFile).mockResolvedValue("invalid json");
    const result = await loadConfig("/dummy");
    expect(result).toEqual({
      ok: false,
      error: "Invalid JSON in rayu-config.json",
    });
  });

  describe("Feature: rayu-worker-agent, Property 8: Configuration validation rejects out-of-range values and accepts valid ones", () => {
    const validConfigArbitrary = fc.record(
      {
        binaryPath: fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
        timeoutSeconds: fc.integer({ min: 30, max: 3600 }),
        maxOutputBytes: fc.integer({ min: 1024, max: 10485760 }),
        cliFlags: fc.array(
          fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
          { maxLength: 20 },
        ),
        maxContextBytes: fc.integer({ min: 1024, max: 1048576 }),
      },
      { withDeletedKeys: true },
    );

    it("accepts all valid configs", async () => {
      await fc.assert(
        fc.asyncProperty(validConfigArbitrary, async (configObj) => {
          vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(configObj));
          const result = await loadConfig("/dummy");
          expect(result.ok).toBe(true);
        }),
      );
    });

    const invalidTimeoutArb = fc.oneof(
      fc.integer({ max: 29 }),
      fc.integer({ min: 3601 }),
    );
    it("rejects out-of-range timeoutSeconds", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          invalidTimeoutArb,
          async (configObj, invalidTimeout) => {
            vi.mocked(fs.readFile).mockResolvedValue(
              JSON.stringify({ ...configObj, timeoutSeconds: invalidTimeout }),
            );
            const result = await loadConfig("/dummy");
            expect(result).toEqual({
              ok: false,
              error: "timeoutSeconds must be between 30 and 3600",
            });
          },
        ),
      );
    });

    const invalidOutputArb = fc.oneof(
      fc.integer({ max: 1023 }),
      fc.integer({ min: 10485761 }),
    );
    it("rejects out-of-range maxOutputBytes", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          invalidOutputArb,
          async (configObj, invalidOutput) => {
            vi.mocked(fs.readFile).mockResolvedValue(
              JSON.stringify({ ...configObj, maxOutputBytes: invalidOutput }),
            );
            const result = await loadConfig("/dummy");
            expect(result).toEqual({
              ok: false,
              error: "maxOutputBytes must be between 1024 and 10485760",
            });
          },
        ),
      );
    });

    it("rejects empty binaryPath", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          fc.constant("   "),
          async (configObj, invalidBinaryPath) => {
            vi.mocked(fs.readFile).mockResolvedValue(
              JSON.stringify({ ...configObj, binaryPath: invalidBinaryPath }),
            );
            const result = await loadConfig("/dummy");
            expect(result).toEqual({
              ok: false,
              error: "binaryPath must be a non-empty string",
            });
          },
        ),
      );
    });

    const oversizedFlagsArb = fc.array(
      fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
      { minLength: 21 },
    );
    it("rejects oversized cliFlags", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          oversizedFlagsArb,
          async (configObj, invalidFlags) => {
            vi.mocked(fs.readFile).mockResolvedValue(
              JSON.stringify({ ...configObj, cliFlags: invalidFlags }),
            );
            const result = await loadConfig("/dummy");
            expect(result).toEqual({
              ok: false,
              error: "cliFlags must be an array with max 20 items",
            });
          },
        ),
      );
    });

    it("rejects empty strings in cliFlags", async () => {
      await fc.assert(
        fc.asyncProperty(validConfigArbitrary, async (configObj) => {
          vi.mocked(fs.readFile).mockResolvedValue(
            JSON.stringify({ ...configObj, cliFlags: ["valid", "   "] }),
          );
          const result = await loadConfig("/dummy");
          expect(result).toEqual({
            ok: false,
            error: "cliFlags entries must be non-empty strings",
          });
        }),
      );
    });

    const invalidContextArb = fc.oneof(
      fc.integer({ max: 1023 }),
      fc.integer({ min: 1048577 }),
    );
    it("rejects out-of-range maxContextBytes", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          invalidContextArb,
          async (configObj, invalidContext) => {
            vi.mocked(fs.readFile).mockResolvedValue(
              JSON.stringify({ ...configObj, maxContextBytes: invalidContext }),
            );
            const result = await loadConfig("/dummy");
            expect(result).toEqual({
              ok: false,
              error: "maxContextBytes must be between 1024 and 1048576",
            });
          },
        ),
      );
    });
  });

  describe("Feature: rayu-worker-agent, Property 9: Environment variable overrides take precedence over config file values", () => {
    const validConfigArbitrary = fc.record({
      binaryPath: fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
      timeoutSeconds: fc.integer({ min: 30, max: 3600 }),
      maxOutputBytes: fc.integer({ min: 1024, max: 10485760 }),
      cliFlags: fc.array(
        fc.string({ minLength: 1 }).filter((s) => s.trim() !== ""),
        { maxLength: 20, minLength: 1 },
      ), // Needs minLength 1 to format as string array
      maxContextBytes: fc.integer({ min: 1024, max: 1048576 }),
    });

    const validEnvArbitrary = fc.record(
      {
        RAYU_BINARY_PATH: fc
          .string({ minLength: 1 })
          .filter((s) => s.trim() !== ""),
        RAYU_TIMEOUT: fc.integer({ min: 30, max: 3600 }).map(String),
        RAYU_MAX_OUTPUT: fc.integer({ min: 1024, max: 10485760 }).map(String),
        RAYU_CLI_FLAGS: fc
          .array(
            fc
              .string({ minLength: 1 })
              .filter((s) => s.trim() !== "" && !s.includes(",")),
            { maxLength: 20, minLength: 1 },
          )
          .map((arr) => arr.join(",")),
      },
      { withDeletedKeys: true },
    );

    it("resolves config using env values where present, file values where not", async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigArbitrary,
          validEnvArbitrary,
          async (fileObj, envOverrides) => {
            vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(fileObj));

            try {
              Object.keys(envOverrides).forEach((k) => {
                process.env[k] = envOverrides[k as keyof typeof envOverrides];
              });

              const result = await loadConfig("/dummy");
              expect(result.ok).toBe(true);

              if (result.ok) {
                expect(result.config.binaryPath).toBe(
                  envOverrides.RAYU_BINARY_PATH ?? fileObj.binaryPath,
                );
                expect(result.config.timeoutSeconds).toBe(
                  envOverrides.RAYU_TIMEOUT
                    ? parseInt(envOverrides.RAYU_TIMEOUT, 10)
                    : fileObj.timeoutSeconds,
                );
                expect(result.config.maxOutputBytes).toBe(
                  envOverrides.RAYU_MAX_OUTPUT
                    ? parseInt(envOverrides.RAYU_MAX_OUTPUT, 10)
                    : fileObj.maxOutputBytes,
                );
                expect(result.config.cliFlags).toEqual(
                  envOverrides.RAYU_CLI_FLAGS
                    ? envOverrides.RAYU_CLI_FLAGS.split(",")
                    : fileObj.cliFlags,
                );
              }
            } finally {
              for (const k of Object.keys(envOverrides)) {
                delete process.env[k];
              }
            }
          },
        ),
      );
    });

    it("rejects invalid environment variables", async () => {
      vi.mocked(fs.readFile).mockRejectedValue({ code: "ENOENT" });
      process.env.RAYU_TIMEOUT = "invalid";
      let result = await loadConfig("/dummy");
      expect(result).toEqual({
        ok: false,
        error: "RAYU_TIMEOUT must be an integer between 30 and 3600",
      });
      delete process.env.RAYU_TIMEOUT;

      process.env.RAYU_TIMEOUT = "30xyz";
      result = await loadConfig("/dummy");
      expect(result).toEqual({
        ok: false,
        error: "RAYU_TIMEOUT must be an integer between 30 and 3600",
      });
      delete process.env.RAYU_TIMEOUT;

      process.env.RAYU_MAX_OUTPUT = "5";
      result = await loadConfig("/dummy");
      expect(result).toEqual({
        ok: false,
        error: "RAYU_MAX_OUTPUT must be an integer between 1024 and 10485760",
      });
      delete process.env.RAYU_MAX_OUTPUT;
    });
  });
});
