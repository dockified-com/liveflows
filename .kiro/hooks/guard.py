#!/usr/bin/env python3
"""LiveFlows agent guardrails — preToolUse hook.

Every rule here exists because it ALREADY WENT WRONG in this project. When an
agent makes a new class of mistake, add a rule rather than re-explaining it in a
prompt: a prompt is advice, a hook is enforcement.

Contract (Kiro CLI hooks):
  stdin  -> JSON { hook_event_name, cwd, tool_name, tool_input }
  exit 0 -> allow
  exit 2 -> BLOCK, stderr is handed to the model as the reason

Rules, and the incident each came from:
  1. Prisma schema-engine command aimed at the PgBouncer transaction pooler.
     Cost: a 26-minute silent hang, no error, no timeout. The schema engine
     needs a session-mode connection (port 5432 / DIRECT_URL); against the
     transaction pooler on 6543 it blocks forever instead of failing.
  2. Creating middleware.ts. Next.js 16 uses proxy.ts; middleware.ts is
     silently ignored, so the failure looks like "auth just doesn't run".
  3. Importing a package that is not declared in package.json. Cost: a
     prisma.config.ts that imported dotenv, which was never installed, so the
     config failed to load and every prisma command misread its datasource.
  4. Writing an unpinned dependency (^ or ~) into package.json. The plan
     requires exact pins.
  5. Introducing ESLint or Prettier. The project lints and formats with Biome
     only.
  6. Destructive database commands (migrate reset, DROP DATABASE/SCHEMA).
"""

import json
import os
import re
import sys

BUILTINS = {
    "assert", "async_hooks", "buffer", "child_process", "cluster", "console",
    "constants", "crypto", "dgram", "diagnostics_channel", "dns", "domain",
    "events", "fs", "http", "http2", "https", "inspector", "module", "net",
    "os", "path", "perf_hooks", "process", "punycode", "querystring",
    "readline", "repl", "stream", "string_decoder", "sys", "timers", "tls",
    "trace_events", "tty", "url", "util", "v8", "vm", "wasi", "worker_threads",
    "zlib",
}

# Packages Next.js/React provide implicitly or that are always present.
IMPLICIT = {"next", "react", "react-dom", "prisma", "@prisma/client"}

# The project's PINNED STACK. These are sanctioned by the plan, so importing one
# a moment before `pnpm add` runs is a harmless ordering nit, not the dotenv
# incident. The dotenv incident was importing a package that was never part of
# the stack at all — that is what this rule exists to catch.
PLANNED = {
    "@excalidraw/excalidraw", "@liveblocks/client", "@liveblocks/react",
    "@liveblocks/node", "@clerk/nextjs", "@clerk/testing", "@prisma/adapter-pg",
    "pg", "zod", "zustand", "vitest", "@playwright/test", "@biomejs/biome",
    "tailwindcss", "@tailwindcss/postcss", "svix",
}


def block(msg: str) -> None:
    sys.stderr.write("BLOCKED by LiveFlows guardrail\n\n" + msg + "\n")
    sys.exit(2)


def read_event() -> dict:
    try:
        return json.loads(sys.stdin.read() or "{}")
    except Exception:
        return {}


def pooler_url(url: str) -> bool:
    """True if this connection string is a transaction-mode pooler."""
    if not url:
        return False
    return ":6543" in url or "pgbouncer=true" in url


def env_value(cwd: str, key: str) -> str:
    """Read a key from .env.local without importing anything."""
    path = os.path.join(cwd, ".env.local")
    if not os.path.isfile(path):
        return ""
    try:
        with open(path, "r", encoding="utf-8", errors="replace") as fh:
            for line in fh:
                line = line.strip()
                if line.startswith(f"{key}="):
                    return line.split("=", 1)[1].strip().strip("'\"")
    except OSError:
        return ""
    return ""


def check_shell(cmd: str, cwd: str) -> None:
    low = " ".join(cmd.split())

    # Rule 6 — destructive database operations
    if re.search(r"prisma\s+migrate\s+reset", low):
        block(
            "`prisma migrate reset` DROPS the database. This project points at a "
            "real Supabase instance, so this is not recoverable.\n"
            "If you need a clean database for tests, use the throwaway Postgres in "
            "docker-compose.test.yml instead."
        )
    if re.search(r"drop\s+(database|schema)\s", low, re.I):
        block("Refusing to run DROP DATABASE / DROP SCHEMA against a live database.")

    # Rule 1 — schema engine vs transaction pooler (the 26-minute hang)
    schema_engine_cmd = re.search(
        r"prisma\s+(migrate\s+\w+|db\s+(execute|push|pull)|studio)", low
    )
    if schema_engine_cmd:
        # What will the schema engine actually connect to?
        effective = ""
        m = re.search(r"DATABASE_URL=(\S+)", cmd)
        if m:
            effective = m.group(1).strip("'\"")
        else:
            effective = env_value(cwd, "DATABASE_URL")

        cfg = os.path.join(cwd, "prisma.config.ts")
        cfg_uses_database_url = False
        if os.path.isfile(cfg):
            try:
                with open(cfg, "r", encoding="utf-8", errors="replace") as fh:
                    body = fh.read()
                cfg_uses_database_url = "DATABASE_URL" in body and "DIRECT_URL" not in body
            except OSError:
                pass

        if pooler_url(effective) and cfg_uses_database_url:
            direct = env_value(cwd, "DIRECT_URL")
            hint = (
                f"DIRECT_URL is present and points at port "
                f"{'5432' if ':5432' in direct else '(check it)'}."
                if direct else "DIRECT_URL is not set in .env.local."
            )
            block(
                f"`{schema_engine_cmd.group(0)}` runs through the Prisma SCHEMA ENGINE, "
                "which requires a SESSION-mode Postgres connection.\n\n"
                "Your effective DATABASE_URL is the Supabase TRANSACTION pooler "
                "(port 6543 / pgbouncer=true). The schema engine does not error against "
                "it — it HANGS INDEFINITELY. This already cost this project a "
                "26-minute silent stall.\n\n"
                f"{hint}\n\n"
                "Fix the cause, not the symptom: prisma.config.ts must give the schema "
                "engine the direct URL. Point `datasource.url` at DIRECT_URL (session "
                "mode, port 5432) and reserve the pooled DATABASE_URL for the runtime "
                "client via the driver adapter.\n\n"
                "Note also that `prisma db execute` needs `--url` or a `datasource` "
                "block it can resolve; confirm which one the installed prisma@7.9.1 "
                "expects before retrying."
            )

    # Rule 5 — Biome only
    if re.search(r"(pnpm|npm|yarn)\s+(add|install|i)\b.*\b(eslint|prettier)\b", low):
        block(
            "This project lints and formats with Biome only. Adding ESLint or Prettier "
            "is explicitly forbidden by the plan's Global Constraints."
        )

    # Rule 4 — no unpinned dependencies
    if re.search(r"(pnpm|npm|yarn)\s+add\b", low) and not re.search(r"(^|\s)-E(\s|$)|--save-exact", low):
        if re.search(r"@[\^~]", low) or not re.search(r"@\d", low):
            block(
                "Dependencies in this project must be pinned EXACTLY — no `^`, no `~`.\n"
                "Use the exact-version form, e.g.:\n"
                "  pnpm add -E @excalidraw/excalidraw@0.18.1\n"
                "Pass -E and an explicit version for every package."
            )

    # npm/yarn are not the package manager
    if re.search(r"^\s*(npm|yarn)\s+(install|add|run|ci)\b", low):
        block("This project uses pnpm only. Never npm or yarn — they desync pnpm-lock.yaml.")


def check_write(tool_input: dict, cwd: str) -> None:
    path = tool_input.get("path") or ""
    content = tool_input.get("content") or tool_input.get("newStr") or ""
    base = os.path.basename(path)

    # Rule 2 — Next.js 16 uses proxy.ts
    if base in ("middleware.ts", "middleware.js"):
        block(
            "Next.js 16 does not use middleware.ts — it uses `proxy.ts`.\n"
            "A middleware.ts file is silently ignored, so authentication simply never "
            "runs and nothing tells you why. Create/edit proxy.ts instead, and read "
            "node_modules/next/dist/docs/ first."
        )

    # Rule 1b — the ROOT CAUSE: prisma.config.ts feeding the schema engine the
    # pooled URL. Blocking only the hanging command is too late; the bad config is
    # what makes every later schema-engine command hang.
    if base in ("prisma.config.ts", "prisma.config.mts", "prisma.config.js") and content:
        ds = re.search(r"datasource\s*:\s*\{(.*?)\}", content, re.S)
        region = ds.group(1) if ds else content
        if "DATABASE_URL" in region and "DIRECT_URL" not in region:
            block(
                "prisma.config.ts is pointing the Prisma SCHEMA ENGINE at DATABASE_URL.\n\n"
                "DATABASE_URL is the Supabase TRANSACTION pooler (port 6543, "
                "pgbouncer=true). The schema engine requires a SESSION-mode connection. "
                "Against the transaction pooler it does not error — it HANGS FOREVER, with "
                "no output and no timeout. This exact config already cost this project a "
                "26-minute silent stall during gate G0.\n\n"
                "Use DIRECT_URL here (port 5432, session mode):\n"
                "    datasource: { url: process.env.DIRECT_URL ?? '' }\n\n"
                "DATABASE_URL is for the RUNTIME client only, passed to the driver adapter "
                "in the PrismaClient constructor — that is src/server/db.ts, not this file."
            )

    # Rule 4 — unpinned dependency ranges
    if base == "package.json" and content:
        loose = re.findall(r'"([^"]+)"\s*:\s*"([\^~][^"]+)"', content)
        if loose:
            names = ", ".join(f"{k}: {v}" for k, v in loose[:6])
            block(
                "package.json must pin every dependency exactly — no `^`, no `~`.\n"
                f"Unpinned: {names}\n"
                "Write the bare version, e.g. \"3.23.1\" not \"^3.23.1\"."
            )

    # Rule 5 — Biome only
    if base in ("eslint.config.js", "eslint.config.mjs", ".eslintrc", ".eslintrc.json",
                ".prettierrc", ".prettierrc.json", "prettier.config.js"):
        block(
            f"{base} introduces ESLint/Prettier. This project uses Biome only "
            "(biome.json). The plan's Global Constraints forbid both."
        )

    # Rule 3 — never import a package that is not declared
    if content and re.search(r"\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$", path):
        declared = set(IMPLICIT) | set(PLANNED)
        pkg = os.path.join(cwd, "package.json")
        if os.path.isfile(pkg):
            try:
                with open(pkg, "r", encoding="utf-8") as fh:
                    data = json.load(fh)
                for field in ("dependencies", "devDependencies", "peerDependencies",
                              "optionalDependencies"):
                    declared.update((data.get(field) or {}).keys())
            except (OSError, ValueError):
                return  # cannot verify -> do not block

        specs = re.findall(r"""(?:from\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]""", content)
        missing = []
        for spec in specs:
            if spec.startswith((".", "/", "@/", "~/", "node:", "bun:", "data:", "http")):
                continue
            parts = spec.split("/")
            name = "/".join(parts[:2]) if spec.startswith("@") else parts[0]
            if name in BUILTINS or name in declared:
                continue
            if name not in missing:
                missing.append(name)

        if missing:
            block(
                f"{path} imports {', '.join(repr(m) for m in missing)}, which "
                "is NOT declared in package.json.\n\n"
                "This exact mistake already broke this project: prisma.config.ts "
                "imported `dotenv`, dotenv was never installed, the config file failed "
                "to load, and every prisma command silently misread its datasource.\n\n"
                "Either install it with an exact pin (`pnpm add -E <pkg>@<version>`) or "
                "use something already declared. Under pnpm, an undeclared package is "
                "NOT resolvable even if some transitive dependency pulled it in."
            )


def main() -> None:
    event = read_event()
    tool = (event.get("tool_name") or "").lower()
    tool_input = event.get("tool_input") or {}
    cwd = event.get("cwd") or os.getcwd()

    if tool in ("shell", "execute_bash", "executebash", "execute_cmd", "executecmd"):
        cmd = tool_input.get("command") or ""
        if cmd:
            check_shell(cmd, cwd)
    elif tool in ("write", "fs_write", "fswrite"):
        check_write(tool_input, cwd)

    sys.exit(0)


if __name__ == "__main__":
    main()
