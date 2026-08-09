# LiveFlows — Handoff: Multi-File Projects

**Written:** 2026-08-09
**For:** whoever implements the multi-file-projects feature next (human or agent)
**Status:** architecture and design locked, decided, spec written. Nothing built yet for this feature.

This is the entry point. Read this first, then follow the pointers below in order.
It exists so a new agent can pick this up without re-deriving decisions already made
in this session.

---

## 1. Read these, in this order

1. **`/AGENTS.md`** (repo root) — durable project context: product, architecture,
   repo conventions, locked stack, env vars, commands. Always-loaded context for
   any agent working in this repo.
2. **`docs/scope/scope.md`** — the living plan. Feature **N** ("Multi-file projects")
   is the one this handoff is about: status `in-progress`, spec linked, milestone
   checklist. Every other row (A–M, 1, 2–7) is separately tracked context.
3. **`docs/specs/0001-multi-file-projects.md`** — the actual build spec. This is
   what `/develop` (or a human engineer) builds from: 9 acceptance criteria, the
   confirmed data model, a 7-step build plan, and a 3-phase migration plan. **This
   is the source of truth for the data model and lifecycle rules** — if anything
   below summarizes it differently, the spec wins.
4. **`docs/UI-design/final-light-saas/`** — the approved visual direction and the
   interactive wireframe of the tab bar / file tree / split view / drag-and-drop
   model (`project-file-tabs.html`, open it in a browser, it's a working demo of
   the interaction, not just a picture).
5. **`docs/superpowers/specs/2026-08-08-liveflows-design.md`** — the original MVP 1a
   design doc. Still the architecture rationale for everything that predates this
   feature (Liveblocks-as-write-path, the reconciliation loop, webhook patterns).
6. **`docs/superpowers/plans/`** — the delivery graph and spike plans used to build
   MVP 1a itself (already executed, historical record). Explains some code shapes
   you'll see while reading `src/` (e.g. a comment in `projects.ts` referencing a
   "frozen contract" from this plan). Not required reading for the new feature,
   but useful if a piece of existing code looks oddly specific and you want to
   know why.

---

## 2. What was decided this session (the durable record)

### 2.1 Product decision: projects become file/folder containers

A `Project` is no longer one canvas. It's a container, Drive-style: folders and
files nested arbitrarily. Confirmed in conversation, formalized in spec 0001.

### 2.2 Product decision: one file, one type, no hybrid

Every file is exactly `document` or `canvas`. Never both. This was a deliberate
rejection of a competing pattern (Eraser.io's Document/Both/Canvas view switcher,
see `docs/inspiration/document-diagram-screen-inspiration.png`) — that pattern
implies a synced-or-AI-generated relationship between a document and a canvas,
which was cut entirely, not deferred. If a user wants a document and a diagram
together, they open two separate files side by side. There is no third file type
and no "Both" mode.

### 2.3 Product decision: tabs are open files (VS Code model), not view modes

A tab = one open file. Two tabs can split side by side. Confirmed interaction
rules (all pure client UI state, no backend implication):

- **Click** a file in the tree → opens a **new tab**. Never replaces or closes an
  existing tab.
- **Drag** a tab, or a file from the tree, onto a pane's **edge** (left/right/top/
  bottom) → opens a **new split** in that direction (macOS window-snap style).
- **Drag** onto a pane's **center** → **replaces** that pane's current file.
- **Drag** onto the **empty tab bar area** → adds a **new tab**, no layout change
  (Notion-style — this is distinct from dragging onto a pane).

Working demo: `docs/UI-design/final-light-saas/project-file-tabs.html` (open in a
browser; the drag-and-drop is live, not decorative).

### 2.4 Tech decision: document editor is Tiptap via `@liveblocks/react-tiptap`

- **Chosen:** Tiptap (MIT-licensed core), wired through `@liveblocks/react-tiptap`,
  with **our own toolbar UI** (not BlockNote's pre-built Notion-style UI).
- **Why:** same vendor as the canvas (Liveblocks) — no second realtime backend to
  operate. MIT core, no licensing entanglement. Comes with realtime multi-cursor
  editing, comments, mentions, notifications, and version history for free on
  infrastructure we already pay for. `withProsemirrorDocument` gives server-side
  document edits for free — directly reusable when MVP 1b's MCP agents need to
  edit documents, not just canvases.
- **Rejected:** BlockNote's pre-built UI (it's Tiptap underneath anyway, just a
  different visual skin — Notion-style, which doesn't match the Industrial/
  Utilitarian design direction already locked for this app).
- Full reasoning: `AGENTS.md` `## Stack`, and spec 0001's Follow-up section (the
  Tiptap wiring itself is a **separate follow-up spec**, not yet written — see
  §3 below).

### 2.5 Design decision: light-mode SaaS shell, not the dev-console direction

Two earlier exploration rounds (a purple/indigo dev-console direction, then a
green/black terminal direction) were both **rejected and deleted**. The user
provided real inspiration screenshots (`docs/inspiration/diagram-design.png`,
`diagram-component.png`) showing a clean, light-mode, blue-accent SaaS product.
That's the locked direction: `docs/UI-design/final-light-saas/` is the only
surviving wireframe set. Blue accent (`#2563eb`), white cards with soft shadow,
Geist + Geist Mono, generous whitespace. The canvas itself (Excalidraw) is
explicitly **not** restyled — its own hand-drawn look and toolbar stay untouched;
only the shell around it (nav, file tree, tabs, chrome) follows this design.

### 2.6 Data model decision (see spec 0001 for full detail)

`Folder` and `File` as two separate Prisma models (not one polymorphic `Node`
table). `File.type` is `document` or `canvas`. `CanvasSnapshot` re-keys from
`Project.id` to `File.id`. New `DocumentSnapshot` table mirrors `CanvasSnapshot`'s
role but for Tiptap/Prosemirror content. `Project.liveblocksRoomId` and its 1:1
`canvas` relation are removed — that relationship now lives on `File`.

**This is a breaking change to the current 1:1 Project↔canvas model.** Every
existing MVP 1a feature that assumes one project = one room = one snapshot needs
updating: project create/delete, Liveblocks room lifecycle, the canvas
reconciliation loop's callers, and the canvas mirror webhook. The reconciliation
logic itself (`src/features/canvas/element-sync.ts`) needs **no changes** — it
was already pure and file-agnostic.

---

## 3. What is NOT decided yet (do not assume)

These are named gaps, not oversights — they're deliberately deferred to their own
specs so this one stays focused on the data model foundation:

- **The Tiptap editor wiring itself** — toolbar UI, `@liveblocks/react-tiptap`
  integration code, whether to enable comments/mentions/version history now or
  later. Needs its own `/architect` pass once the file/folder foundation (spec
  0001) is built.
- **The tab bar / split-view / drag-and-drop client state** — the interaction
  rules are decided (§2.3 above) and demoed, but the actual React/Zustand state
  management for it has not been spec'd. Needs its own `/architect` pass.
- **Whether split-pane layout persists per project across sessions** — flagged as
  an open question in conversation, never resolved. Recommend persisting it
  (IDE-like), but this is not locked.
- **The canvas mirror webhook's actual file path** — `docs/scope/scope.md` feature
  J notes `src/app/api/webhooks/liveblocks/route.ts` was not found in the current
  source scan. Confirm whether it exists before assuming feature J is further
  along than `in-progress`.
- **`CanvasSnapshot`'s `appState`/`viewBackgroundColor` schema mismatch** — the
  original design doc describes an `appState` JSON field; the real schema has a
  flat `viewBackgroundColor` string column. Unresolved discrepancy, noted in both
  `AGENTS.md` and scope feature B. Resolve before touching that table further.

---

## 4. Where to start building

1. Read spec 0001 in full: `docs/specs/0001-multi-file-projects.md`.
2. Follow its `## Build plan` (7 steps) and `## Migration plan` (3 phases — additive
   first, backfill existing projects into root-level canvas files, destructive
   drop last). The migration plan matters: there is live data (existing projects)
   that must not break.
3. Use `/develop multi-file projects` if working in this skill flow (it reads spec
   0001 and the scope row directly), or build manually against the spec's
   acceptance criteria (AC-1 through AC-9) if not.
4. After the data model and DAL land, the Tiptap wiring and the tab/split UI are
   separate follow-up specs (§3) — don't build them against assumptions from this
   handoff; run `/architect` for each when you get there.
5. Verify against spec 0001's acceptance criteria and critical test scenarios
   before calling this feature done. Scope feature N's tier is Beta — that means
   `/check verify` then `/test` are the expected closing steps.

---

## 5. File map (everything this session touched or created)

| File | What it is |
|---|---|
| `AGENTS.md` | Durable project context, always loaded. Architecture lock, stack lock (now includes Tiptap decision), repo conventions |
| `docs/scope/scope.md` | Living plan. Feature N = this work, `in-progress`, spec-linked |
| `docs/specs/0001-multi-file-projects.md` | The build spec. Source of truth for data model, lifecycle, migration plan |
| `docs/UI-design/final-light-saas/index.html` | Comparison board of the 3 approved screens |
| `docs/UI-design/final-light-saas/workspace-shell.html` | Workspace/project-list screen |
| `docs/UI-design/final-light-saas/canvas-page.html` | Canvas page chrome (Excalidraw itself untouched) |
| `docs/UI-design/final-light-saas/project-file-tabs.html` | **Interactive** file tree + tab bar + split view + drag-and-drop demo |
| `docs/inspiration/diagram-design.png`, `diagram-component.png` | User-provided reference for the light-SaaS direction (adopted) |
| `docs/inspiration/document-diagram-screen-inspiration.png` | Eraser.io reference (rejected — see §2.2) |
| `docs/superpowers/specs/2026-08-08-liveflows-design.md` | Original MVP 1a design doc (predates this session, still authoritative for everything it covers) |

Deleted this session (superseded, do not look for them): `docs/UI-design/shotgun-2026-08-09/`
(purple/indigo round), `docs/UI-design/shotgun-2026-08-09-v2/` (green/black round).
