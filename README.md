# LiveFlows

A collaborative diagramming and documentation workspace for software system architecture. Realtime multiplayer canvas powered by Excalidraw + Liveblocks, structured workspace file trees, independent split views, and rich Tiptap documents.

---

## Quick Start

### 1. Prerequisites
- **Node.js**: >= 20
- **Package Manager**: `pnpm` (locked — do not use `npm` or `yarn`)

### 2. Installation
```bash
# Clone the repository
git clone git@github.com:dockified-com/liveflows.git
cd liveflows

# Install dependencies
pnpm install
```

### 3. Environment Setup
Create a `.env.local` file in the project root:

```env
# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SIGNING_SECRET=whsec_...

# Liveblocks Realtime
LIVEBLOCKS_SECRET_KEY=sk_dev_...
LIVEBLOCKS_WEBHOOK_SECRET=whsec_...

# Database (Supabase / Postgres)
DATABASE_URL=postgresql://postgres:...@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbooster=true
DIRECT_URL=postgresql://postgres:...@db.xxx.supabase.co:5432/postgres
```

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## CLI Development Commands

| Command | Action |
|---|---|
| `pnpm dev` | Starts Next.js 16 development server with Turbopack |
| `pnpm build` | Compiles production build & runs TypeScript check |
| `pnpm test` | Runs Vitest unit & integration test suites |
| `pnpm test:e2e` | Runs Playwright end-to-end browser tests |
| `pnpm lint` | Runs Biome code linter across source files |
| `pnpm format` | Formats codebase with Biome (`--write`) |

---

## Architecture Overview

| Concern | Owner |
|---|---|
| **Realtime Canvas & Document State** | Liveblocks Storage (`LiveMap` & Yjs) |
| **Authentication & Workspaces** | Clerk (Organizations as workspace primitive) |
| **Data Persistence & Metadata** | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| **Canvas Surface** | Excalidraw (`@excalidraw/excalidraw`) |
| **Document Editor** | Tiptap (`@liveblocks/react-tiptap`) |
| **Ephemeral UI Layout State** | Zustand (`src/features/project-workspace/workspace-state.ts`) |

For comprehensive architectural design & DAL authorization rules, see `AGENTS.md` and `docs/specs/2026-08-11-final-light-saas-implementation-plan.md`.
