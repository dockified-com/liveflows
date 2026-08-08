# Team Alpha — Foundation & Delivery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish repo tooling (Biome, Vitest, Playwright), CI pipeline, staging environment, and production deploy with observability for LiveFlows MVP 1a.

**Architecture:** Alpha owns everything outside `src/` that makes the project buildable, testable, and deployable. It provides the foundation that every other team depends on — linting, type-checking, test runners, CI gates, and deployment pipelines. Alpha never touches application source code under `src/`.

**Tech Stack:** Biome 2.4.2, Vitest 4.1.10, Playwright 1.62.1, GitHub Actions, Docker Compose (postgres:17), pnpm 11.20.0, Next.js 16.3.0

## Global Constraints

- **pnpm only** — never npm or yarn. All commands use `pnpm` or `pnpm exec`.
- **Biome only** — never ESLint or Prettier. Linting is `pnpm lint` (`biome check`), formatting is `pnpm format` (`biome format --write`).
- **Versions pinned exactly** — no `^` or `~` in any dependency added by Alpha. Use exact version strings only.
- **Next.js 16 uses `proxy.ts`** — never `middleware.ts`. The file was renamed in Next.js 16.
- **Alpha never edits anything under `src/`** — all Alpha-owned files are at repo root or in `.github/`, `e2e/` (config only), or `docs/`.
- **CI Postgres uses `docker-compose.test.yml`** — postgres:17, provisioned with `prisma db push` in global setup. CI must NEVER point at `DATABASE_URL` or any remote database. The test database connection string is a separate `TEST_DATABASE_URL` variable constructed from the docker-compose service.
- **Rollback rule** — revert the deploy, never roll back migrations. Every 1a migration must be additive so the previous release runs against the new schema.
- **Separate environments** — staging and production use separate Clerk instances, separate Liveblocks projects, and separate Supabase projects. No shared credentials ever. Secrets are referenced by name and never committed.

---

## Task 0: A0 — Repo Tooling (Biome, Vitest, Playwright)

**Files:**
- Modify: `package.json` (add devDependencies and scripts)
- Modify: `biome.json` (add generated file exclusions)
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `docker-compose.test.yml`
- Create: `vitest.global-setup.ts`

**Interfaces:**
- Consumes: G0 ESM decision (must be resolved before this task starts — determines whether `"type": "module"` is in `package.json`)
- Produces: `pnpm test` runs Vitest; `pnpm exec playwright test` runs Playwright; `pnpm lint` and `pnpm build` continue to work; `docker-compose.test.yml` provides a test Postgres on port 5433

---

- [ ] **Step 1: Install Vitest and Playwright as exact-version devDependencies**

Run:
```bash
pnpm add -D --save-exact vitest@4.1.10 @playwright/test@1.62.1 @clerk/testing@2.2.19
```

Verify `package.json` shows exact versions (no `^` or `~`):
```bash
cat package.json | grep -E "vitest|playwright|clerk/testing"
```

Expected: `"vitest": "4.1.10"`, `"@playwright/test": "1.62.1"`, `"@clerk/testing": "2.2.19"`

- [ ] **Step 2: Add test scripts to package.json**

Add the following to the `"scripts"` block in `package.json`:
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "biome check",
    "format": "biome format --write",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

- [ ] **Step 3: Create docker-compose.test.yml**

Create `docker-compose.test.yml` at repo root with this exact content:
```yaml
services:
  postgres-test:
    image: postgres:17
    ports:
      - "5433:5432"
    environment:
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
      POSTGRES_DB: liveflows_test
    tmpfs:
      - /var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test -d liveflows_test"]
      interval: 2s
      timeout: 5s
      retries: 10
```

Note: `tmpfs` ensures the test database is ephemeral and fast — data is discarded when the container stops.

- [ ] **Step 4: Create vitest.global-setup.ts**

Create `vitest.global-setup.ts` at repo root:
```ts
import { execSync } from "node:child_process";

export async function setup() {
  const testDatabaseUrl =
    "postgresql://test:test@localhost:5433/liveflows_test";

  // Start the test Postgres container
  execSync("docker compose -f docker-compose.test.yml up -d --wait", {
    stdio: "inherit",
  });

  // Push the schema to the test database (no migrations, just sync)
  execSync("pnpm exec prisma db push --skip-generate", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
  });
}

export async function teardown() {
  execSync("docker compose -f docker-compose.test.yml down", {
    stdio: "inherit",
  });
}
```

- [ ] **Step 5: Create vitest.config.ts**

Create `vitest.config.ts` at repo root:
```ts
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/e2e/**", "**/.next/**"],
    globals: false,
    environment: "node",
    globalSetup: ["./vitest.global-setup.ts"],
    restoreMocks: true,
    testTimeout: 10000,
    env: {
      TEST_DATABASE_URL: "postgresql://test:test@localhost:5433/liveflows_test",
    },
  },
});
```

- [ ] **Step 6: Create playwright.config.ts**

Create `playwright.config.ts` at repo root:
```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm run build && pnpm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
```

- [ ] **Step 7: Update biome.json to exclude generated files**

Modify `biome.json` — update the `files.includes` array to also exclude generated Prisma output:
```json
{
  "$schema": "https://biomejs.dev/schemas/2.4.2/schema.json",
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignoreUnknown": true,
    "includes": ["**", "!node_modules", "!.next", "!dist", "!build", "!src/generated"]
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2
  },
  "css": {
    "parser": {
      "tailwindDirectives": true
    }
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true
    },
    "domains": {
      "next": "recommended",
      "react": "recommended"
    }
  },
  "assist": {
    "actions": {
      "source": {
        "organizeImports": "on"
      }
    }
  }
}
```

- [ ] **Step 8: Install Playwright browsers**

Run:
```bash
pnpm exec playwright install --with-deps chromium
```

- [ ] **Step 9: Create e2e directory with a placeholder**

Create `e2e/.gitkeep`:
```bash
mkdir -p e2e && touch e2e/.gitkeep
```

This directory is owned by Team Foxtrot. Alpha creates it only so `playwright.config.ts` has a valid `testDir`.

- [ ] **Step 10: Verify all tooling works**

Run each command and confirm it exits 0:
```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
```

Run Vitest (it should report "no test files found" but exit 0 with `--passWithNoTests`):
```bash
pnpm test --run --passWithNoTests
```

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml biome.json vitest.config.ts vitest.global-setup.ts playwright.config.ts docker-compose.test.yml e2e/.gitkeep
git commit -m "feat(alpha): A0 repo tooling — Biome, Vitest, Playwright, test Postgres"
```

---

## Task 1: A1 — CI Pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: A0 tooling (Vitest, Playwright configs, `docker-compose.test.yml`, package.json scripts)
- Produces: Every PR into `development` is gated by: install → lint → tsc → prisma generate → test → build → playwright (once F0 lands). All stages blocking, in that order.

**CRITICAL:** CI must NEVER point at `DATABASE_URL`. The integration test Postgres is provided exclusively by `docker-compose.test.yml` on postgres:17, provisioned with `prisma db push` in the Vitest global setup. The `TEST_DATABASE_URL` is constructed from the docker-compose service and used only for tests.

---

- [ ] **Step 1: Create .github/workflows directory**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Create .github/workflows/ci.yml**

Create `.github/workflows/ci.yml` with this exact content:
```yaml
name: CI

on:
  pull_request:
    branches: [development, main]
  push:
    branches: [development]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    timeout-minutes: 15

    services:
      postgres-test:
        image: postgres:17
        ports:
          - 5433:5432
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: liveflows_test
        options: >-
          --health-cmd "pg_isready -U test -d liveflows_test"
          --health-interval 2s
          --health-timeout 5s
          --health-retries 10

    env:
      TEST_DATABASE_URL: postgresql://test:test@localhost:5433/liveflows_test
      # Dummy values so prisma generate and build don't fail on missing env vars.
      # These are NEVER used to connect to a real database or service.
      DATABASE_URL: postgresql://unused:unused@localhost:5432/unused
      DIRECT_URL: postgresql://unused:unused@localhost:5432/unused
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: pk_test_unused
      CLERK_SECRET_KEY: sk_test_unused
      LIVEBLOCKS_SECRET_KEY: sk_test_unused

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      # Stage 1: Install (frozen lockfile — no mutations allowed)
      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      # Stage 2: Lint (Biome check)
      - name: Lint
        run: pnpm lint

      # Stage 3: Type check
      - name: Type check
        run: pnpm exec tsc --noEmit

      # Stage 4: Prisma generate
      - name: Prisma generate
        run: pnpm exec prisma generate

      # Stage 5: Unit & integration tests
      - name: Push schema to test database
        run: pnpm exec prisma db push --skip-generate
        env:
          DATABASE_URL: ${{ env.TEST_DATABASE_URL }}

      - name: Run tests
        run: pnpm test --run --passWithNoTests

      # Stage 6: Build
      - name: Build
        run: pnpm build

      # Stage 7: Playwright E2E (enabled once F0 lands)
      # Uncomment when Team Foxtrot delivers F0 (E2E harness)
      # - name: Install Playwright browsers
      #   run: pnpm exec playwright install --with-deps chromium
      # - name: Run Playwright tests
      #   run: pnpm exec playwright test
```

- [ ] **Step 3: Verify the workflow file is valid YAML**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))" 2>&1 || echo "YAML INVALID"
```

If python3 or pyyaml is not available, use:
```bash
pnpm exec biome check .github/workflows/ci.yml || true
```

(Biome may not lint YAML, but the file should at least not cause errors.)

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "feat(alpha): A1 CI pipeline — all stages blocking, test Postgres from services"
```

---

## Task 2: A2 — Staging Environment & Deploy

**Files:**
- Create: `.github/workflows/deploy-staging.yml`
- Create: `docs/superpowers/runbooks/staging-env.md`

**Interfaces:**
- Consumes: A1 CI pipeline (must be green); F1 auth + CRUD E2E (must be passing)
- Produces: Staging deployment triggered on merge to `development`; staging URL available for F3 smoke tests

**Entry criteria (verbatim from delivery graph §9):** `A1` green and `F1` passing.

**Environment separation rules:**
- Staging uses a separate Clerk **development** instance (not the production instance in dev mode)
- Staging uses a separate Liveblocks **dev** project with its own secret key
- Staging uses a separate Supabase project with its own pooler and direct URLs
- No credential is ever shared between staging and production
- All secrets are stored in the deployment platform's secret store, never in the repo

**Required staging secrets (by name — values never committed):**
- `STAGING_DATABASE_URL` — Supabase pooler URL for the staging project
- `STAGING_DIRECT_URL` — Supabase direct URL for the staging project
- `STAGING_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk staging dev instance publishable key
- `STAGING_CLERK_SECRET_KEY` — Clerk staging dev instance secret key
- `STAGING_CLERK_WEBHOOK_SIGNING_SECRET` — Clerk webhook secret for staging endpoint
- `STAGING_LIVEBLOCKS_SECRET_KEY` — Liveblocks dev project secret key
- `STAGING_LIVEBLOCKS_WEBHOOK_SECRET` — Liveblocks webhook secret for staging endpoint

---

- [ ] **Step 1: Create the staging deployment workflow**

Create `.github/workflows/deploy-staging.yml`:
```yaml
name: Deploy to Staging

on:
  push:
    branches: [development]
  workflow_dispatch:

concurrency:
  group: deploy-staging
  cancel-in-progress: true

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: staging

    env:
      DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
      DIRECT_URL: ${{ secrets.STAGING_DIRECT_URL }}
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.STAGING_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      CLERK_SECRET_KEY: ${{ secrets.STAGING_CLERK_SECRET_KEY }}
      CLERK_WEBHOOK_SIGNING_SECRET: ${{ secrets.STAGING_CLERK_WEBHOOK_SIGNING_SECRET }}
      LIVEBLOCKS_SECRET_KEY: ${{ secrets.STAGING_LIVEBLOCKS_SECRET_KEY }}
      LIVEBLOCKS_WEBHOOK_SECRET: ${{ secrets.STAGING_LIVEBLOCKS_WEBHOOK_SECRET }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm exec prisma generate

      - name: Run migrations (additive only)
        run: pnpm exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.STAGING_DIRECT_URL }}

      - name: Build
        run: pnpm build

      # NOTE: Replace this step with your actual deploy command.
      # Options: Vercel CLI (`vercel --prod`), Docker push, or platform-specific deploy.
      # The deploy target and command depend on the hosting decision which is
      # NOT YET SPECIFIED in the delivery graph. See "Underspecified" note at bottom.
      - name: Deploy to staging
        run: |
          echo "::warning::Deploy command not yet configured — hosting platform unspecified in delivery graph."
          echo "Replace this step with the actual deploy command (e.g., vercel deploy --env staging)"
          exit 1
```

- [ ] **Step 2: Create the staging environment runbook**

Create `docs/superpowers/runbooks/staging-env.md`:
```markdown
# Staging Environment Runbook

## Overview

Staging mirrors production configuration with separate service instances.
It deploys automatically on every merge to `development` after CI passes.

## Service Instances (all separate from production)

| Service | Instance Type | Purpose |
|---|---|---|
| Clerk | Development instance | Auth, orgs, webhooks |
| Liveblocks | Dev project | Realtime, rooms, Storage |
| Supabase | Separate project | Postgres host |

## Secrets

All secrets are stored in the GitHub environment `staging`. They are never
committed to the repository or shared with the production environment.

| Secret Name | Source |
|---|---|
| `STAGING_DATABASE_URL` | Supabase staging project → Settings → Database → Connection string (pooler, port 6543) |
| `STAGING_DIRECT_URL` | Supabase staging project → Settings → Database → Connection string (direct, port 5432) |
| `STAGING_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk staging instance → API Keys |
| `STAGING_CLERK_SECRET_KEY` | Clerk staging instance → API Keys |
| `STAGING_CLERK_WEBHOOK_SIGNING_SECRET` | Clerk staging instance → Webhooks → Signing Secret |
| `STAGING_LIVEBLOCKS_SECRET_KEY` | Liveblocks dev project → API Keys |
| `STAGING_LIVEBLOCKS_WEBHOOK_SECRET` | Liveblocks dev project → Webhooks → Secret |

## Webhook Registration

After first deploy, register webhook endpoints:

1. **Clerk:** In the staging Clerk instance, add webhook endpoint:
   `https://<staging-domain>/api/webhooks/clerk`
   Subscribe to: `user.created`, `user.updated`, `user.deleted`,
   `organization.created`, `organization.updated`,
   `organizationMembership.created`, `organizationMembership.updated`,
   `organizationMembership.deleted`

2. **Liveblocks:** In the staging Liveblocks project, add webhook endpoint:
   `https://<staging-domain>/api/webhooks/liveblocks`
   Subscribe to: `storageUpdated`

## Migrations

Migrations run via `prisma migrate deploy` against `STAGING_DIRECT_URL`.
Every migration must be additive — the rollback strategy is to revert the
deploy, never to roll back the migration.

## Rollback

To roll back staging:
1. Revert the merge commit on `development` or re-deploy a previous commit
2. Do NOT roll back database migrations
3. Liveblocks Storage is unaffected — it lives outside the deploy
```

- [ ] **Step 3: Verify workflow YAML validity**

```bash
python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy-staging.yml'))" 2>&1 || echo "YAML INVALID"
```

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-staging.yml docs/superpowers/runbooks/staging-env.md
git commit -m "feat(alpha): A2 staging deploy workflow and runbook"
```

---

## Task 3: A3 — Production Deploy & Observability

**Files:**
- Create: `.github/workflows/deploy-production.yml`
- Create: `docs/superpowers/runbooks/production-env.md`
- Create: `docs/superpowers/runbooks/observability.md`

**Interfaces:**
- Consumes: A2 staging deploy (working); F2 two-client collab E2E (passing against staging); F3 smoke tests (passing against staging); spec §14 has no BLOCKING items; runbook merged
- Produces: Production deployment triggered on merge to `main`; observability signals configured; rollback procedure documented

**Entry criteria (verbatim from delivery graph §9):**
1. `F2` two-client collab E2E passing against staging
2. `F3` smoke tests passing against staging
3. Spec §14 has no BLOCKING items
4. Runbook merged

**Environment separation rules (same as staging, distinct instances):**
- Production uses a Clerk **production** instance — a distinct instance, not a mode toggle
- Production uses a Liveblocks **production** project; secret key in the platform secret store, never in the repo
- Production uses a Supabase production project; pooler URL for `DATABASE_URL`, direct URL for `DIRECT_URL`
- Webhook endpoints re-registered against the production domain, with fresh signing secrets
- No credential is ever shared with staging

**Required production secrets (by name — values never committed):**
- `PROD_DATABASE_URL` — Supabase pooler URL for the production project
- `PROD_DIRECT_URL` — Supabase direct URL for the production project
- `PROD_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk production instance publishable key
- `PROD_CLERK_SECRET_KEY` — Clerk production instance secret key
- `PROD_CLERK_WEBHOOK_SIGNING_SECRET` — Clerk webhook secret for production endpoint
- `PROD_LIVEBLOCKS_SECRET_KEY` — Liveblocks production project secret key
- `PROD_LIVEBLOCKS_WEBHOOK_SECRET` — Liveblocks webhook secret for production endpoint

---

- [ ] **Step 1: Create the production deployment workflow**

Create `.github/workflows/deploy-production.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-production
  cancel-in-progress: false  # Never cancel an in-progress production deploy

jobs:
  deploy-production:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment: production

    env:
      DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}
      DIRECT_URL: ${{ secrets.PROD_DIRECT_URL }}
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ${{ secrets.PROD_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY }}
      CLERK_SECRET_KEY: ${{ secrets.PROD_CLERK_SECRET_KEY }}
      CLERK_WEBHOOK_SIGNING_SECRET: ${{ secrets.PROD_CLERK_WEBHOOK_SIGNING_SECRET }}
      LIVEBLOCKS_SECRET_KEY: ${{ secrets.PROD_LIVEBLOCKS_SECRET_KEY }}
      LIVEBLOCKS_WEBHOOK_SECRET: ${{ secrets.PROD_LIVEBLOCKS_WEBHOOK_SECRET }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Generate Prisma client
        run: pnpm exec prisma generate

      - name: Run migrations (additive only — never rollback)
        run: pnpm exec prisma migrate deploy
        env:
          DATABASE_URL: ${{ secrets.PROD_DIRECT_URL }}

      - name: Build
        run: pnpm build

      # NOTE: Replace this step with your actual deploy command.
      # The deploy target and command depend on the hosting decision which is
      # NOT YET SPECIFIED in the delivery graph. See "Underspecified" note at bottom.
      - name: Deploy to production
        run: |
          echo "::warning::Deploy command not yet configured — hosting platform unspecified in delivery graph."
          echo "Replace this step with the actual deploy command."
          exit 1
```

- [ ] **Step 2: Create the production environment runbook**

Create `docs/superpowers/runbooks/production-env.md`:
```markdown
# Production Environment Runbook

## Overview

Production deploys on merge to `main`. This only happens after all entry
criteria are met (see below). Production uses entirely separate service
instances from staging — no shared credentials ever.

## Entry Criteria (ALL required before first production deploy)

1. F2 two-client collab E2E passing against staging
2. F3 smoke tests passing against staging
3. Spec §14 has no BLOCKING items
4. This runbook merged

## Service Instances (all separate from staging)

| Service | Instance Type | Purpose |
|---|---|---|
| Clerk | Production instance | Auth, orgs, webhooks |
| Liveblocks | Production project | Realtime, rooms, Storage |
| Supabase | Production project | Postgres host |

## Secrets

All secrets are stored in the GitHub environment `production` (with required
reviewers enabled). They are never committed to the repository.

| Secret Name | Source |
|---|---|
| `PROD_DATABASE_URL` | Supabase prod project → Settings → Database → Connection string (pooler, port 6543) |
| `PROD_DIRECT_URL` | Supabase prod project → Settings → Database → Connection string (direct, port 5432) |
| `PROD_NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk production instance → API Keys |
| `PROD_CLERK_SECRET_KEY` | Clerk production instance → API Keys |
| `PROD_CLERK_WEBHOOK_SIGNING_SECRET` | Clerk production instance → Webhooks → Signing Secret |
| `PROD_LIVEBLOCKS_SECRET_KEY` | Liveblocks production project → API Keys |
| `PROD_LIVEBLOCKS_WEBHOOK_SECRET` | Liveblocks production project → Webhooks → Secret |

## Webhook Registration

Register webhook endpoints in PRODUCTION instances (not staging):

1. **Clerk:** Production Clerk instance → Webhooks → Add endpoint:
   `https://<production-domain>/api/webhooks/clerk`
   Subscribe to: `user.created`, `user.updated`, `user.deleted`,
   `organization.created`, `organization.updated`,
   `organizationMembership.created`, `organizationMembership.updated`,
   `organizationMembership.deleted`

2. **Liveblocks:** Production Liveblocks project → Webhooks → Add endpoint:
   `https://<production-domain>/api/webhooks/liveblocks`
   Subscribe to: `storageUpdated`

## Migrations

Migrations run via `prisma migrate deploy` against `PROD_DIRECT_URL`.

**CRITICAL RULE:** Every migration must be additive. The rollback strategy
is to revert the deploy, never to roll back the migration. This means:
- Only add columns (nullable or with defaults), never remove them
- Only add tables, never drop them
- Only add indexes, never remove them
- If a column must be removed, do it in a later release after the code
  no longer references it

## Rollback Procedure

1. Identify the failing commit on `main`
2. Revert the commit: `git revert <sha> && git push origin main`
3. The deploy workflow triggers automatically with the reverted code
4. **Do NOT** roll back database migrations — the previous code version
   must work against the current schema (this is why migrations are additive)
5. Liveblocks Storage is unaffected — it is the source of truth and lives
   outside the deploy
6. Verify rollback with the F3 smoke tests against production

## Incident Response

- If Liveblocks is unreachable: canvas goes read-only from CanvasSnapshot mirror.
  Auth, lists, workspace pages are unaffected. No data loss — availability issue only.
- If Clerk webhooks stop: DAL lazy upsert covers the acting user. Membership
  drift is temporary and resolves when webhooks resume.
- If `storageUpdated` webhook drops: mirror goes stale. Liveblocks retries.
  Canvas is unaffected (reads Liveblocks directly).
```

- [ ] **Step 3: Create the observability runbook**

Create `docs/superpowers/runbooks/observability.md`:
```markdown
# Observability — Minimum Viable Signals

## Overview

These six signals are the required minimum for production. Each one detects
a specific failure mode of the LiveFlows architecture that would otherwise
be silent.

## Required Signals

### 1. `storageUpdated` webhook success rate

**Why it matters:** A silent drop means the Postgres mirror goes stale and
project lists lie. Users see outdated data with no error indication.

**What to monitor:**
- HTTP response codes on `POST /api/webhooks/liveblocks`
- Rate of 4xx/5xx responses
- Alert threshold: success rate < 95% over 5 minutes

**Implementation:** Log structured JSON on every webhook invocation:
```json
{"event": "webhook.liveblocks", "status": 200, "roomId": "proj_xxx", "duration_ms": 45}
```

### 2. Liveblocks room connection failures

**Why it matters:** The canvas is unusable while auth or room permissions
are misconfigured. This is the primary user-facing failure mode.

**What to monitor:**
- Failures on `POST /api/liveblocks-auth`
- Client-side connection errors (Liveblocks status events)
- Alert threshold: > 5 auth failures in 1 minute

**Implementation:** Log on every auth endpoint call:
```json
{"event": "liveblocks.auth", "status": 200, "userId": "user_xxx", "orgId": "org_xxx"}
```

### 3. `CanvasSnapshot.syncedAt` age, p99

**Why it matters:** Direct measure of mirror staleness. If p99 exceeds
5 minutes, project lists are showing significantly stale data.

**What to monitor:**
- `NOW() - syncedAt` for all active projects (those viewed in the last 24h)
- Alert threshold: p99 > 5 minutes

**Implementation:** Periodic query (every 5 minutes):
```sql
SELECT
  MAX(EXTRACT(EPOCH FROM (NOW() - "syncedAt"))) as max_age_seconds,
  PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (NOW() - "syncedAt"))) as p99_age_seconds
FROM "CanvasSnapshot"
WHERE "syncedAt" > NOW() - INTERVAL '24 hours';
```

### 4. `CanvasSnapshot.elementCount`, max

**Why it matters:** Early warning for the ~10MB room ceiling. A room
approaching this limit will start failing writes with no graceful
degradation unless caught proactively.

**What to monitor:**
- Maximum `elementCount` across all snapshots
- Alert threshold: any project > 5000 elements (configurable)

**Implementation:** Periodic query (every hour):
```sql
SELECT "projectId", "elementCount"
FROM "CanvasSnapshot"
WHERE "elementCount" > 5000
ORDER BY "elementCount" DESC;
```

### 5. Orphan room count

**Why it matters:** Rooms whose `Project` row is gone consume Liveblocks
plan limits silently. They accumulate if room deletion fails during
project deletion.

**What to monitor:**
- Count of rooms in Liveblocks that have no matching `Project.liveblocksRoomId`
- Alert threshold: any orphan rooms detected

**Implementation:** Periodic reconciliation (daily):
1. List all rooms via Liveblocks REST API (`GET /v2/rooms`)
2. Query all `Project.liveblocksRoomId` values
3. Diff: rooms in Liveblocks but not in Postgres = orphans
4. Log orphan room IDs at WARN level for manual cleanup

### 6. Clerk webhook success rate

**Why it matters:** Membership drift between Clerk and Postgres. If
webhooks fail, new org members won't appear in project lists and
removed members may retain stale access rows.

**What to monitor:**
- HTTP response codes on `POST /api/webhooks/clerk`
- Rate of 4xx/5xx responses
- Alert threshold: success rate < 95% over 5 minutes

**Implementation:** Log on every webhook invocation:
```json
{"event": "webhook.clerk", "status": 200, "type": "organizationMembership.created", "svixId": "msg_xxx"}
```

## Implementation Notes

- The exact monitoring platform (Datadog, Grafana, Vercel Analytics, etc.) is
  NOT YET SPECIFIED in the delivery graph. The structured logging above is
  platform-agnostic and works with any log aggregator.
- All six signals should be dashboarded together — they form the complete
  picture of the Liveblocks ↔ Postgres ↔ Clerk triangle health.
- The periodic queries (signals 3, 4, 5) can be implemented as:
  - A cron job / scheduled function
  - A monitoring platform's synthetic check
  - A GitHub Action on a schedule
  The choice depends on the hosting platform decision.
```

- [ ] **Step 4: Verify all workflow YAML files are valid**

```bash
for f in .github/workflows/*.yml; do
  echo "Checking $f..."
  python3 -c "import yaml; yaml.safe_load(open('$f'))" 2>&1 || echo "INVALID: $f"
done
```

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/deploy-production.yml docs/superpowers/runbooks/production-env.md docs/superpowers/runbooks/observability.md
git commit -m "feat(alpha): A3 production deploy, observability signals, and runbooks"
```

---

## Underspecified Items in the Delivery Graph

The following items are required by this plan but not specified in the delivery graph or spec:

1. **Hosting platform** — The graph says "staging environment" and "production deploy" but never names the hosting platform (Vercel, Fly.io, Railway, Docker on EC2, etc.). The deploy step in both workflows is a placeholder `exit 1` until this is decided. This blocks A2 and A3 from being fully executable.

2. **Monitoring/observability platform** — The six signals are defined but the tooling to collect and alert on them (Datadog, Grafana Cloud, Vercel Analytics, custom) is unspecified. The plan uses structured logging as a platform-agnostic foundation.

3. **Node.js version** — The graph and spec do not pin a Node.js version. This plan uses Node.js 22 (current LTS) in CI workflows. If a different version is required, update the `node-version` field in all workflow files.

4. **GitHub environment protection rules** — The plan assumes GitHub Environments (`staging` and `production`) with secrets, but whether `production` requires manual approval is not specified. Recommended: require at least one reviewer for production deploys.

5. **F0 integration into CI** — The Playwright E2E stage is commented out in `ci.yml` pending Team Foxtrot's F0 delivery. The graph says "once F0 lands" but does not specify who uncomments it. This plan assumes Alpha uncomments the Playwright stage when notified that F0 has merged.
