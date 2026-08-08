# Team Echo — Product Surface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the user-facing application shell, project list with CRUD, and canvas page wiring — the product surface that consumes Team Charlie's DAL and Team Bravo's `<CanvasRoom>`.

**Architecture:** Echo owns everything the user sees and interacts with outside the canvas itself. It renders Server Components that call the DAL for data, Client Components for interactivity (org switcher, modals, navigation), and wires Bravo's `<CanvasRoom>` into the canvas route. Echo NEVER imports from `@prisma/client`, `@liveblocks/client`, `@liveblocks/react`, or `@liveblocks/node` directly. All data flows through the DAL; all canvas concerns stay inside Bravo's boundary.

**Tech Stack:** Next.js 16 App Router, React 19, Clerk 7.7.1 (`@clerk/nextjs`), Zustand 5, Tailwind v4, Vitest 4

## Global Constraints

- **Hard architectural rule:** Echo consumes the DAL and renders. It NEVER queries Prisma directly and never calls Liveblocks directly. Authorization lives in one place — the DAL. Every data access goes through Team Charlie's frozen DAL signatures reproduced below.
- **File boundary — DO NOT TOUCH:** `src/features/canvas/**` (Bravo), `src/server/dal/**` (Charlie), `src/server/db.ts` (Charlie), `src/server/liveblocks.ts` (Delta), `src/app/api/**` (Charlie/Delta), `proxy.ts` (Charlie)
- **Stub protocol:** Because Charlie's and Bravo's code will not exist when Echo starts, write local stubs that THROW: `throw new Error('STUB: awaiting <team> <node>')`. A stub that returns fake data is FORBIDDEN — it produces green tests that prove nothing. Every stub is deleted in the same commit that consumes the real implementation.
- **Accessibility:** Everything user-facing must use real semantics (`<nav>`, `<main>`, `<h1>`–`<h6>`, `<button>`, `<ul>`/`<li>`), be keyboard reachable, and have labelled controls (`aria-label` or visible `<label>`).
- **Testing:** Vitest for unit and component tests. A test that asserts against a mock of the code under test, or that would still pass if the component were deleted, is a defect.
- **Next.js 16:** Uses `proxy.ts` not `middleware.ts`. Layout signature uses `LayoutProps<"/">`. Route groups use `(groupName)` convention. File convention unchanged from App Router.
- **Clerk 7 (Core 3):** `<Show when="signed-in">` replaces `<SignedIn>`. `<Show when="signed-out">` replaces `<SignedOut>`. `auth()` is always awaited. `isAuthenticated` not `!!userId`.
- **Zustand 5:** Store created per-room via provider factory for canvas session state. Module-level store for global UI state only.
- **Tailwind v4:** Utility-first, no component library.
- **Package manager:** pnpm only. Never npm or yarn.

## Frozen DAL Contracts (from delivery graph §6)

These are the exact signatures Echo codes against. Until Charlie merges C1, Echo uses throwing stubs matching these signatures.

```ts
// src/server/dal/workspaces.ts
export type WorkspaceRef = { id: string; slug: string }

/** Asserts session, asserts orgSlug === slugFromUrl, lazy-upserts. Redirects on failure. */
export function requireWorkspace(slugFromUrl: string): Promise<WorkspaceRef>

/** For route handlers with no slug in the path. Throws UnauthorizedError. */
export function requireWorkspaceByOrgId(orgId: string): Promise<WorkspaceRef>
```

```ts
// src/server/dal/projects.ts
export type ProjectListItem = {
  id: string
  name: string
  updatedAt: Date
}

export type ProjectDetail = ProjectListItem & { liveblocksRoomId: string }

export function listProjects(workspaceSlug: string): Promise<ProjectListItem[]>
export function getProject(workspaceSlug: string, projectId: string): Promise<ProjectDetail>
export function createProject(workspaceSlug: string, name: string): Promise<ProjectDetail>
export function deleteProject(workspaceSlug: string, projectId: string): Promise<void>
```

## Frozen Canvas Contract (from delivery graph §6)

```ts
// src/features/canvas/canvas-room.tsx
export function CanvasRoom(props: {
  roomId: string
  fallbackElements: unknown[]   // from CanvasSnapshot, for read-only outage mode
}): JSX.Element
```

Echo renders `<CanvasRoom roomId=... fallbackElements=... />` and passes nothing else.

## Underspecified / Self-Contradictory Items Found

1. **`fallbackElements` source:** ~~The DAL contract in §6 exposes `getProject()` returning `ProjectDetail` which has `liveblocksRoomId` but NOT `CanvasSnapshot.elements`. There is no `getCanvasSnapshot(workspaceSlug, projectId): Promise<unknown[]>` in the frozen interface.~~ **RESOLVED (plan-fix-time 2026-08-08):** `getProjectWithSnapshot` has been added to Charlie's C1 as an addition to the frozen contract. Echo stubs it locally at `src/stubs/dal-snapshot.ts` until Charlie C1 merges.
2. **`LayoutProps<"/">` type:** The existing `src/app/layout.tsx` uses `LayoutProps<"/">` which appears to be a Next.js 16 generated type (from `.next/types`). This is new and not in training data — the plan uses it as-is since the scaffolded project already demonstrates the pattern.

---

## Task 0: E0 — App Shell (Nav, Org Switcher, ClerkProvider)

**Wave:** 2 (depends on Charlie C2 for ClerkProvider handoff)

**Files:**
- Modify: `src/app/layout.tsx` (root layout — apply ClerkProvider from Charlie C2 handoff)
- Create: `src/app/(app)/layout.tsx` (authenticated app shell with nav + org switcher)
- Create: `src/components/app-nav.tsx` (nav bar client component)
- Create: `src/stores/ui.ts` (global UI state — sidebar open, modal)
- Create: `src/app/(app)/layout.test.tsx` (component test)
- Create: `src/components/app-nav.test.tsx` (component test)
- Create: `src/stores/ui.test.ts` (unit test)

**Interfaces:**
- Consumes: Charlie C2 handoff — exact `<ClerkProvider>` JSX to wrap root layout
- Consumes: Charlie C2 — `src/app/session-tasks/choose-organization/page.tsx` (created by Charlie; Echo does NOT create this file)
- Consumes: `@clerk/nextjs` — `ClerkProvider`, `OrganizationSwitcher`, `UserButton`, `Show`, `SignInButton`
- Produces: authenticated app shell layout that all `(app)` routes render inside

> **Deliberate ruling (plan-fix-time):** `src/app/session-tasks/` falls outside both `src/app/(app)/**` (Echo) and `src/app/(auth)/**` (Charlie) as declared in the ownership map §5. Assigned to Charlie because session-task pages are Clerk auth infrastructure created as part of C2. Echo consumes the page but does not create it.

---

- [ ] **Step 1: Create the global UI Zustand store**

Create `src/stores/ui.ts`:

```ts
import { create } from 'zustand'

type ModalState =
  | null
  | { kind: 'create-project' }
  | { kind: 'rename-project'; id: string }
  | { kind: 'delete-project'; id: string }

type UiState = {
  sidebarOpen: boolean
  modal: ModalState
  toggleSidebar: () => void
  openModal: (modal: ModalState) => void
  closeModal: () => void
}

export const useUiStore = create<UiState>((set) => ({
  sidebarOpen: true,
  modal: null,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (modal) => set({ modal }),
  closeModal: () => set({ modal: null }),
}))
```

- [ ] **Step 2: Write failing test for UI store**

Create `src/stores/ui.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useUiStore } from './ui'

describe('useUiStore', () => {
  beforeEach(() => {
    // Reset store between tests
    useUiStore.setState({
      sidebarOpen: true,
      modal: null,
    })
  })

  it('toggles sidebar', () => {
    const { toggleSidebar } = useUiStore.getState()
    toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(false)
    toggleSidebar()
    expect(useUiStore.getState().sidebarOpen).toBe(true)
  })

  it('opens and closes modals', () => {
    const { openModal, closeModal } = useUiStore.getState()
    openModal({ kind: 'create-project' })
    expect(useUiStore.getState().modal).toEqual({ kind: 'create-project' })
    closeModal()
    expect(useUiStore.getState().modal).toBeNull()
  })

  it('opens rename modal with project id', () => {
    const { openModal } = useUiStore.getState()
    openModal({ kind: 'rename-project', id: 'proj_123' })
    expect(useUiStore.getState().modal).toEqual({ kind: 'rename-project', id: 'proj_123' })
  })
})
```

- [ ] **Step 3: Run tests to verify they pass**

Run: `pnpm vitest run src/stores/ui.test.ts`
Expected: 3 tests PASS

- [ ] **Step 4: Create the AppNav client component**

Create `src/components/app-nav.tsx`:

```tsx
'use client'

import { OrganizationSwitcher, UserButton, Show, SignInButton } from '@clerk/nextjs'
import { useUiStore } from '@/stores/ui'

export function AppNav() {
  const { sidebarOpen, toggleSidebar } = useUiStore()

  return (
    <header
      role="banner"
      className="flex items-center justify-between border-b border-gray-200 px-4 h-14"
    >
      <nav aria-label="Main navigation" className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-expanded={sidebarOpen}
          className="rounded p-1.5 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <svg
            aria-hidden="true"
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <OrganizationSwitcher />
      </nav>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  )
}
```

- [ ] **Step 5: Write component test for AppNav**

Create `src/components/app-nav.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AppNav } from './app-nav'

// Mock @clerk/nextjs — we test that OUR component renders the right structure,
// not that Clerk works. These mocks are thin passthroughs.
vi.mock('@clerk/nextjs', () => ({
  OrganizationSwitcher: () => <div data-testid="org-switcher" />,
  UserButton: () => <div data-testid="user-button" />,
  Show: ({ when, children }: { when: string; children: React.ReactNode }) => (
    <div data-testid={`show-${when}`}>{children}</div>
  ),
  SignInButton: () => <button data-testid="sign-in-button">Sign in</button>,
}))

describe('AppNav', () => {
  beforeEach(() => {
    const { useUiStore } = await import('@/stores/ui')
    useUiStore.setState({ sidebarOpen: true, modal: null })
  })

  it('renders a banner header with main navigation', () => {
    render(<AppNav />)
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: /main navigation/i })).toBeInTheDocument()
  })

  it('renders the org switcher', () => {
    render(<AppNav />)
    expect(screen.getByTestId('org-switcher')).toBeInTheDocument()
  })

  it('has an accessible sidebar toggle button', () => {
    render(<AppNav />)
    const btn = screen.getByRole('button', { name: /close sidebar/i })
    expect(btn).toHaveAttribute('aria-expanded', 'true')
  })

  it('toggles sidebar state on button click', async () => {
    render(<AppNav />)
    const btn = screen.getByRole('button', { name: /close sidebar/i })
    fireEvent.click(btn)
    expect(btn).toHaveAttribute('aria-label', 'Open sidebar')
    expect(btn).toHaveAttribute('aria-expanded', 'false')
  })
})
```

**NOTE:** This test requires `@testing-library/react` and `@testing-library/jest-dom` as dev dependencies. If not yet installed by another team, add them. The `beforeEach` uses top-level await which requires ESM test config — verify against the vitest config from Alpha A0.

- [ ] **Step 6: Run component test**

Run: `pnpm vitest run src/components/app-nav.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 7: Apply Charlie C2 handoff to root layout**

Modify `src/app/layout.tsx` to wrap with `<ClerkProvider>` and register `taskUrls`. This is the ONE cross-team edit — apply Charlie's handoff verbatim:

```tsx
import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'LiveFlows',
  description: 'Collaborative diagramming for software system design',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          taskUrls={{ 'choose-organization': '/session-tasks/choose-organization' }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create the authenticated app layout with shell**

Create `src/app/(app)/layout.tsx`:

```tsx
import { AppNav } from '@/components/app-nav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      <AppNav />
      <main className="flex-1">{children}</main>
    </div>
  )
}
```

- [ ] **Step 9: Verify choose-organization page exists from Charlie C2**

`src/app/session-tasks/choose-organization/page.tsx` is created by Charlie C2 and consumed by Echo. Do NOT create it here. After Charlie C2 merges, verify the file exists and renders `TaskChooseOrganization` in the expected centered layout.

- [ ] **Step 10: Write test for the app layout rendering structure**

Create `src/app/(app)/layout.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import AppLayout from './layout'

vi.mock('@/components/app-nav', () => ({
  AppNav: () => <header data-testid="app-nav">Nav</header>,
}))

describe('AppLayout', () => {
  it('renders AppNav and a main landmark containing children', () => {
    render(
      <AppLayout>
        <p>Test content</p>
      </AppLayout>
    )
    expect(screen.getByTestId('app-nav')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Test content')
  })
})
```

- [ ] **Step 11: Run all E0 tests**

Run: `pnpm vitest run src/stores/ui.test.ts src/components/app-nav.test.tsx src/app/\\(app\\)/layout.test.tsx`
Expected: All tests PASS

- [ ] **Step 12: Verify build**

Run: `pnpm build`
Expected: Build succeeds with no type errors related to Echo files

- [ ] **Step 13: Commit**

```bash
git add src/app/layout.tsx src/app/\(app\)/layout.tsx src/app/\(app\)/layout.test.tsx \
  src/components/app-nav.tsx src/components/app-nav.test.tsx \
  src/stores/ui.ts src/stores/ui.test.ts
git commit -m "feat(echo): E0 app shell — nav, org switcher, ClerkProvider"
```

---

## Task 1: E1 — Project List + CRUD UI

**Wave:** 3 (depends on E0, Charlie C1 for DAL)

**Files:**
- Create: `src/app/(app)/w/[workspaceSlug]/page.tsx` (project list — Server Component)
- Create: `src/app/(app)/w/[workspaceSlug]/loading.tsx` (Suspense fallback)
- Create: `src/components/project-list.tsx` (presentational list)
- Create: `src/components/project-list.test.tsx` (component test)
- Create: `src/components/create-project-modal.tsx` (create dialog)
- Create: `src/components/create-project-modal.test.tsx` (component test)
- Create: `src/components/delete-project-dialog.tsx` (confirm delete)
- Create: `src/components/delete-project-dialog.test.tsx` (component test)
- Create: `src/app/(app)/w/[workspaceSlug]/actions.ts` (server actions for create/delete)
- Create: `src/app/(app)/w/[workspaceSlug]/actions.test.ts` (action tests)
- Create: `src/stubs/dal.ts` (throwing stubs for DAL — deleted when Charlie C1 merges)

**Interfaces:**
- Consumes: `requireWorkspace(slugFromUrl)` from `src/server/dal/workspaces.ts`
- Consumes: `listProjects(workspaceSlug)`, `createProject(workspaceSlug, name)`, `deleteProject(workspaceSlug, projectId)` from `src/server/dal/projects.ts`
- Produces: Project list page rendering from Postgres (NO Liveblocks calls), create/delete flows

**Key constraint:** The project list renders from Postgres with no Liveblocks call at all. This is guaranteed by the DAL — `listProjects` queries Postgres only.

---

- [ ] **Step 1: Create throwing DAL stubs**

Create `src/stubs/dal.ts`. These stubs exist ONLY until Charlie's C1 merges. They throw — never return fake data. Types are defined inline (not imported from Charlie's paths) to avoid writing files at `src/server/dal/` which is exclusively Charlie-owned per §5.

```ts
// TEMPORARY STUBS — delete in the same commit that wires real DAL imports.
// These exist so Echo's code compiles and type-checks against the frozen interface.
// They MUST throw — a stub returning fake data produces green tests that prove nothing.
//
// Types are defined locally here — Echo MUST NOT create files at src/server/dal/*
// because that path is exclusively owned by Charlie (delivery graph §5).
// When Charlie merges C1, change imports from '@/stubs/dal' to '@/server/dal/workspaces'
// and '@/server/dal/projects', then delete this file in the same commit.

export type WorkspaceRef = { id: string; slug: string }

export type ProjectListItem = {
  id: string
  name: string
  updatedAt: Date
}

export type ProjectDetail = ProjectListItem & { liveblocksRoomId: string }

export function requireWorkspace(_slugFromUrl: string): Promise<WorkspaceRef> {
  throw new Error('STUB: awaiting Charlie C1 — requireWorkspace')
}

export function requireWorkspaceByOrgId(_orgId: string): Promise<WorkspaceRef> {
  throw new Error('STUB: awaiting Charlie C1 — requireWorkspaceByOrgId')
}

export function listProjects(_workspaceSlug: string): Promise<ProjectListItem[]> {
  throw new Error('STUB: awaiting Charlie C1 — listProjects')
}

export function getProject(_workspaceSlug: string, _projectId: string): Promise<ProjectDetail> {
  throw new Error('STUB: awaiting Charlie C1 — getProject')
}

export function createProject(_workspaceSlug: string, _name: string): Promise<ProjectDetail> {
  throw new Error('STUB: awaiting Charlie C1 — createProject')
}

export function deleteProject(_workspaceSlug: string, _projectId: string): Promise<void> {
  throw new Error('STUB: awaiting Charlie C1 — deleteProject')
}
```

**IMPORTANT:** Echo MUST NOT create files at `src/server/dal/workspaces.ts` or `src/server/dal/projects.ts` — those paths are exclusively owned by Charlie (delivery graph §5). Writing stubs there guarantees a merge conflict when Charlie's C1 lands. Echo imports from `@/stubs/dal` until Charlie C1 merges, then switches imports to `@/server/dal/workspaces` and `@/server/dal/projects` and deletes `src/stubs/dal.ts` in the same commit.

- [ ] **Step 2: Create the ProjectList presentational component**

Create `src/components/project-list.tsx`:

```tsx
'use client'

import Link from 'next/link'
import type { ProjectListItem } from '@/server/dal/projects'
import { useUiStore } from '@/stores/ui'

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

export function ProjectList({
  projects,
  workspaceSlug,
}: {
  projects: ProjectListItem[]
  workspaceSlug: string
}) {
  const { openModal } = useUiStore()

  return (
    <section aria-labelledby="projects-heading">
      <div className="flex items-center justify-between mb-6">
        <h1 id="projects-heading" className="text-2xl font-semibold">
          Projects
        </h1>
        <button
          type="button"
          onClick={() => openModal({ kind: 'create-project' })}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">No projects yet. Create one to get started.</p>
      ) : (
        <ul role="list" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/w/${workspaceSlug}/p/${project.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <h2 className="text-base font-medium truncate">{project.name}</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Updated {formatDate(project.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
```

- [ ] **Step 3: Write component test for ProjectList**

Create `src/components/project-list.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ProjectList } from './project-list'
import { useUiStore } from '@/stores/ui'

// Mock next/link to render a plain anchor
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}))

const mockProjects = [
  { id: 'p1', name: 'Auth Flow', updatedAt: new Date('2026-08-01') },
  { id: 'p2', name: 'Data Pipeline', updatedAt: new Date('2026-08-05') },
]

describe('ProjectList', () => {
  beforeEach(() => {
    useUiStore.setState({ sidebarOpen: true, modal: null })
  })

  it('renders a heading and list of projects', () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />)
    expect(screen.getByRole('heading', { name: /projects/i })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders project links with correct hrefs', () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />)
    const link = screen.getByRole('link', { name: /auth flow/i })
    expect(link).toHaveAttribute('href', '/w/acme/p/p1')
  })

  it('shows empty state when no projects', () => {
    render(<ProjectList projects={[]} workspaceSlug="acme" />)
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument()
  })

  it('opens create-project modal on button click', () => {
    render(<ProjectList projects={mockProjects} workspaceSlug="acme" />)
    fireEvent.click(screen.getByRole('button', { name: /new project/i }))
    expect(useUiStore.getState().modal).toEqual({ kind: 'create-project' })
  })
})
```

- [ ] **Step 4: Run ProjectList tests**

Run: `pnpm vitest run src/components/project-list.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 5: Create the CreateProjectModal component**

Create `src/components/create-project-modal.tsx`:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useUiStore } from '@/stores/ui'

export function CreateProjectModal({
  createAction,
}: {
  createAction: (formData: FormData) => Promise<void>
}) {
  const { modal, closeModal } = useUiStore()
  const dialogRef = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const isOpen = modal?.kind === 'create-project'

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      dialog.showModal()
      inputRef.current?.focus()
    } else {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      onClose={closeModal}
      aria-labelledby="create-project-title"
      className="rounded-lg p-0 backdrop:bg-black/50"
    >
      <form
        action={createAction}
        onSubmit={() => closeModal()}
        className="p-6 w-80"
      >
        <h2 id="create-project-title" className="text-lg font-semibold mb-4">
          Create project
        </h2>
        <label htmlFor="project-name" className="block text-sm font-medium mb-1">
          Project name
        </label>
        <input
          ref={inputRef}
          id="project-name"
          name="name"
          type="text"
          required
          minLength={1}
          maxLength={100}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="e.g. Auth Architecture"
        />
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            Create
          </button>
        </div>
      </form>
    </dialog>
  )
}
```

- [ ] **Step 6: Write test for CreateProjectModal**

Create `src/components/create-project-modal.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CreateProjectModal } from './create-project-modal'
import { useUiStore } from '@/stores/ui'

describe('CreateProjectModal', () => {
  const mockAction = vi.fn()

  beforeEach(() => {
    mockAction.mockClear()
    useUiStore.setState({ sidebarOpen: true, modal: null })
    // Mock HTMLDialogElement methods not available in jsdom
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })

  it('does not show dialog when modal state is null', () => {
    render(<CreateProjectModal createAction={mockAction} />)
    expect(HTMLDialogElement.prototype.showModal).not.toHaveBeenCalled()
  })

  it('shows dialog when modal state is create-project', () => {
    useUiStore.setState({ modal: { kind: 'create-project' } })
    render(<CreateProjectModal createAction={mockAction} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('has an accessible labelled input', () => {
    useUiStore.setState({ modal: { kind: 'create-project' } })
    render(<CreateProjectModal createAction={mockAction} />)
    expect(screen.getByLabelText(/project name/i)).toBeInTheDocument()
  })

  it('closes modal on cancel click', () => {
    useUiStore.setState({ modal: { kind: 'create-project' } })
    render(<CreateProjectModal createAction={mockAction} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(useUiStore.getState().modal).toBeNull()
  })
})
```

- [ ] **Step 7: Run CreateProjectModal tests**

Run: `pnpm vitest run src/components/create-project-modal.test.tsx`
Expected: 4 tests PASS

- [ ] **Step 8: Create the DeleteProjectDialog component**

Create `src/components/delete-project-dialog.tsx`:

```tsx
'use client'

import { useRef, useEffect } from 'react'
import { useUiStore } from '@/stores/ui'

export function DeleteProjectDialog({
  deleteAction,
}: {
  deleteAction: (formData: FormData) => Promise<void>
}) {
  const { modal, closeModal } = useUiStore()
  const dialogRef = useRef<HTMLDialogElement>(null)

  const isOpen = modal?.kind === 'delete-project'
  const projectId = isOpen ? modal.id : null

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [isOpen])

  return (
    <dialog
      ref={dialogRef}
      onClose={closeModal}
      aria-labelledby="delete-project-title"
      className="rounded-lg p-0 backdrop:bg-black/50"
    >
      <form
        action={deleteAction}
        onSubmit={() => closeModal()}
        className="p-6 w-80"
      >
        <h2 id="delete-project-title" className="text-lg font-semibold mb-2">
          Delete project?
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          This will permanently delete the project and its canvas. This action cannot be undone.
        </p>
        <input type="hidden" name="projectId" value={projectId ?? ''} />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={closeModal}
            className="rounded px-3 py-2 text-sm hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
          >
            Delete
          </button>
        </div>
      </form>
    </dialog>
  )
}
```

- [ ] **Step 9: Write test for DeleteProjectDialog**

Create `src/components/delete-project-dialog.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DeleteProjectDialog } from './delete-project-dialog'
import { useUiStore } from '@/stores/ui'

describe('DeleteProjectDialog', () => {
  const mockAction = vi.fn()

  beforeEach(() => {
    mockAction.mockClear()
    useUiStore.setState({ sidebarOpen: true, modal: null })
    HTMLDialogElement.prototype.showModal = vi.fn()
    HTMLDialogElement.prototype.close = vi.fn()
  })

  it('shows dialog when modal is delete-project', () => {
    useUiStore.setState({ modal: { kind: 'delete-project', id: 'p1' } })
    render(<DeleteProjectDialog deleteAction={mockAction} />)
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled()
  })

  it('includes the project id as a hidden input', () => {
    useUiStore.setState({ modal: { kind: 'delete-project', id: 'p1' } })
    render(<DeleteProjectDialog deleteAction={mockAction} />)
    const hidden = document.querySelector('input[name="projectId"]') as HTMLInputElement
    expect(hidden.value).toBe('p1')
  })

  it('closes on cancel', () => {
    useUiStore.setState({ modal: { kind: 'delete-project', id: 'p1' } })
    render(<DeleteProjectDialog deleteAction={mockAction} />)
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(useUiStore.getState().modal).toBeNull()
  })
})
```

- [ ] **Step 10: Run DeleteProjectDialog tests**

Run: `pnpm vitest run src/components/delete-project-dialog.test.tsx`
Expected: 3 tests PASS

- [ ] **Step 11: Create Server Actions for project CRUD**

Create `src/app/(app)/w/[workspaceSlug]/actions.ts`:

```ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createProject, deleteProject } from '@/server/dal/projects'

export async function createProjectAction(
  workspaceSlug: string,
  formData: FormData,
): Promise<void> {
  const name = formData.get('name')
  if (typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('Project name is required')
  }
  if (name.length > 100) {
    throw new Error('Project name must be 100 characters or fewer')
  }

  const project = await createProject(workspaceSlug, name.trim())
  revalidatePath(`/w/${workspaceSlug}`)
  redirect(`/w/${workspaceSlug}/p/${project.id}`)
}

export async function deleteProjectAction(
  workspaceSlug: string,
  formData: FormData,
): Promise<void> {
  const projectId = formData.get('projectId')
  if (typeof projectId !== 'string' || projectId.length === 0) {
    throw new Error('Project ID is required')
  }

  await deleteProject(workspaceSlug, projectId)
  revalidatePath(`/w/${workspaceSlug}`)
}
```

- [ ] **Step 12: Create the project list page (Server Component)**

Create `src/app/(app)/w/[workspaceSlug]/page.tsx`:

```tsx
import { requireWorkspace } from '@/server/dal/workspaces'
import { listProjects } from '@/server/dal/projects'
import { ProjectList } from '@/components/project-list'
import { CreateProjectModal } from '@/components/create-project-modal'
import { DeleteProjectDialog } from '@/components/delete-project-dialog'
import { createProjectAction, deleteProjectAction } from './actions'

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>
}) {
  const { workspaceSlug } = await params
  const workspace = await requireWorkspace(workspaceSlug)
  const projects = await listProjects(workspace.slug)

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ProjectList projects={projects} workspaceSlug={workspace.slug} />
      <CreateProjectModal
        createAction={createProjectAction.bind(null, workspace.slug)}
      />
      <DeleteProjectDialog
        deleteAction={deleteProjectAction.bind(null, workspace.slug)}
      />
    </div>
  )
}
```

- [ ] **Step 13: Create loading fallback**

Create `src/app/(app)/w/[workspaceSlug]/loading.tsx`:

```tsx
export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8" aria-busy="true" aria-label="Loading projects">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 14: Write test for server actions (validation logic)**

Create `src/app/(app)/w/[workspaceSlug]/actions.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DAL — these are the throwing stubs that prove we call the DAL correctly
vi.mock('@/server/dal/projects', () => ({
  createProject: vi.fn(),
  deleteProject: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

describe('createProjectAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws if name is empty', async () => {
    const { createProjectAction } = await import('./actions')
    const fd = new FormData()
    fd.set('name', '')
    await expect(createProjectAction('acme', fd)).rejects.toThrow('Project name is required')
  })

  it('throws if name exceeds 100 characters', async () => {
    const { createProjectAction } = await import('./actions')
    const fd = new FormData()
    fd.set('name', 'x'.repeat(101))
    await expect(createProjectAction('acme', fd)).rejects.toThrow('100 characters')
  })

  it('calls createProject with trimmed name and redirects', async () => {
    const { createProject } = await import('@/server/dal/projects')
    const { redirect } = await import('next/navigation')
    const { revalidatePath } = await import('next/cache')
    ;(createProject as any).mockResolvedValue({ id: 'p1', name: 'Test', updatedAt: new Date(), liveblocksRoomId: 'proj_p1' })

    const { createProjectAction } = await import('./actions')
    const fd = new FormData()
    fd.set('name', '  Test  ')
    await createProjectAction('acme', fd)

    expect(createProject).toHaveBeenCalledWith('acme', 'Test')
    expect(revalidatePath).toHaveBeenCalledWith('/w/acme')
    expect(redirect).toHaveBeenCalledWith('/w/acme/p/p1')
  })
})

describe('deleteProjectAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('throws if projectId is empty', async () => {
    const { deleteProjectAction } = await import('./actions')
    const fd = new FormData()
    fd.set('projectId', '')
    await expect(deleteProjectAction('acme', fd)).rejects.toThrow('Project ID is required')
  })

  it('calls deleteProject and revalidates', async () => {
    const { deleteProject } = await import('@/server/dal/projects')
    const { revalidatePath } = await import('next/cache')
    ;(deleteProject as any).mockResolvedValue(undefined)

    const { deleteProjectAction } = await import('./actions')
    const fd = new FormData()
    fd.set('projectId', 'p1')
    await deleteProjectAction('acme', fd)

    expect(deleteProject).toHaveBeenCalledWith('acme', 'p1')
    expect(revalidatePath).toHaveBeenCalledWith('/w/acme')
  })
})
```

- [ ] **Step 15: Run all E1 tests**

Run: `pnpm vitest run src/components/project-list.test.tsx src/components/create-project-modal.test.tsx src/components/delete-project-dialog.test.tsx src/app/\\(app\\)/w/\\[workspaceSlug\\]/actions.test.ts`
Expected: All tests PASS

- [ ] **Step 16: Verify build**

Run: `pnpm build`
Expected: Build succeeds. The stubs throw at runtime but the types check at compile time.

- [ ] **Step 17: Commit**

```bash
git add src/stubs/ \
  src/components/project-list.tsx src/components/project-list.test.tsx \
  src/components/create-project-modal.tsx src/components/create-project-modal.test.tsx \
  src/components/delete-project-dialog.tsx src/components/delete-project-dialog.test.tsx \
  src/app/\(app\)/w/ 
git commit -m "feat(echo): E1 project list + CRUD UI with DAL stubs"
```

- [ ] **Step 18: Wire real DAL when Charlie C1 merges**

When Charlie merges C1 into `development` and Echo rebases:

1. Delete `src/stubs/dal.ts` entirely
2. Verify that `src/server/dal/workspaces.ts` and `src/server/dal/projects.ts` now contain Charlie's real implementations matching the frozen signatures
3. Run: `pnpm vitest run` — all Echo tests must still pass (they test component behaviour, not DAL internals)
4. Run: `pnpm build` — must succeed
5. Commit the stub deletion in the same commit as the rebase

---

## Task 2: E2 — Canvas Page Wiring

**Wave:** 6 (depends on E1, Bravo B3 for CanvasRoom, Delta D0 for liveblocks-auth)

**Files:**
- Create: `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx` (canvas page — Server Component)
- Create: `src/app/(app)/w/[workspaceSlug]/p/[projectId]/loading.tsx` (Suspense fallback)
- Create: `src/app/(app)/w/[workspaceSlug]/p/[projectId]/error.tsx` (Error boundary — canvas isolation)
- Create: `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.test.tsx` (component test)
- Create: `src/stubs/canvas-room.tsx` (throwing stub for CanvasRoom — deleted when Bravo B3 merges)
- Create: `src/stubs/dal-snapshot.ts` (throwing stub for getProjectWithSnapshot — deleted when Charlie adds it)

**Interfaces:**
- Consumes: `requireWorkspace(slugFromUrl)` from `src/server/dal/workspaces.ts`
- Consumes: `getProject(workspaceSlug, projectId)` from `src/server/dal/projects.ts`
- Consumes: `getProjectWithSnapshot(workspaceSlug, projectId)` from `src/server/dal/projects.ts` — **RESOLVED (plan-fix-time 2026-08-08): Added to Charlie C1 as an addition to the frozen contract. Signature is byte-identical between producer (Charlie) and consumer (Echo).**
- Consumes: `CanvasRoom` from `src/features/canvas/canvas-room.tsx` (Bravo B3)
- Produces: Canvas page that renders read/write via Liveblocks (normal) or read-only from Postgres mirror (outage)

**Key constraints:**
- Echo renders `<CanvasRoom roomId={...} fallbackElements={...} />` and passes NOTHING else
- Every canvas concern (Excalidraw, Liveblocks connection, pointer gating, presence) stays inside Bravo's boundary
- The outage story: when Liveblocks is blocked at the network level, `CanvasRoom` internally renders read-only using the `fallbackElements` passed from the Postgres `CanvasSnapshot`. Echo's job is to fetch the snapshot and pass it.
- The project list continues to work during a Liveblocks outage because it NEVER calls Liveblocks
- Error boundary around the canvas isolates Excalidraw crashes — the shell survives so the user can navigate away

---

- [ ] **Step 1: Create throwing stub for CanvasRoom**

Create `src/stubs/canvas-room.tsx`. This exists until Bravo merges B3.

```tsx
// TEMPORARY STUB — delete when Bravo B3 merges.
// Must throw, never render — a stub that renders proves nothing.

export function CanvasRoom(_props: {
  roomId: string
  fallbackElements: unknown[]
}): JSX.Element {
  throw new Error('STUB: awaiting Bravo B3 — CanvasRoom')
}
```

- [ ] **Step 2: Create throwing stub for getProjectWithSnapshot**

Create `src/stubs/dal-snapshot.ts`:

```ts
// TEMPORARY STUB — delete when Charlie's C1 merges with getProjectWithSnapshot.
// RESOLVED (plan-fix-time 2026-08-08): This function has been added to Charlie's C1
// as an addition to the frozen contract. Signature below is byte-identical to Charlie's.

export type ProjectWithSnapshot = {
  id: string
  name: string
  updatedAt: Date
  liveblocksRoomId: string
  snapshotElements: unknown[]  // CanvasSnapshot.elements — may be [] if never synced
}

export function getProjectWithSnapshot(
  _workspaceSlug: string,
  _projectId: string,
): Promise<ProjectWithSnapshot> {
  throw new Error('STUB: awaiting Charlie — getProjectWithSnapshot')
}
```

**RESOLVED (plan-fix-time 2026-08-08):** `getProjectWithSnapshot` has been added to Charlie's C1 task as an addition to the frozen contract. The signature above is byte-identical to Charlie's producer signature. This is NOT in the original delivery graph §6 — it is an addition made at plan-fix time to satisfy DoD criterion 6 (Liveblocks-outage read-only path).

- [ ] **Step 3: Create the canvas page (Server Component)**

Create `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`:

```tsx
import { requireWorkspace } from '@/server/dal/workspaces'
import { getProject } from '@/server/dal/projects'
// NOTE: When Charlie provides getProjectWithSnapshot, switch to it.
// For now, fallbackElements defaults to [] which means the outage mode shows an empty canvas.
// The real implementation fetches CanvasSnapshot.elements from Postgres.
import { CanvasRoom } from '@/features/canvas/canvas-room'

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>
}) {
  const { workspaceSlug, projectId } = await params
  const workspace = await requireWorkspace(workspaceSlug)
  const project = await getProject(workspace.slug, projectId)

  // fallbackElements: sourced from CanvasSnapshot in Postgres.
  // This is the read-only outage path — when Liveblocks is unreachable,
  // CanvasRoom renders these elements as a static, non-editable view.
  // TODO: Replace with getProjectWithSnapshot when Charlie adds it to the DAL.
  const fallbackElements: unknown[] = []

  return (
    <CanvasRoom
      roomId={project.liveblocksRoomId}
      fallbackElements={fallbackElements}
    />
  )
}
```

- [ ] **Step 4: Create the canvas error boundary**

Create `src/app/(app)/w/[workspaceSlug]/p/[projectId]/error.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function CanvasError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const params = useParams<{ workspaceSlug: string }>()

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center min-h-[50vh] gap-4 p-8"
    >
      <h1 className="text-xl font-semibold text-red-700">Canvas failed to load</h1>
      <p className="text-sm text-gray-600 max-w-md text-center">
        Something went wrong rendering the canvas. You can try again or go back to your projects.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          Try again
        </button>
        <Link
          href={`/w/${params.workspaceSlug}`}
          className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
        >
          Back to projects
        </Link>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create the canvas loading state**

Create `src/app/(app)/w/[workspaceSlug]/p/[projectId]/loading.tsx`:

```tsx
export default function CanvasLoading() {
  return (
    <div
      className="flex items-center justify-center h-full"
      aria-busy="true"
      aria-label="Loading canvas"
    >
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        <p className="text-sm text-gray-500">Loading canvas…</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Write tests for the canvas page**

Create `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the DAL
vi.mock('@/server/dal/workspaces', () => ({
  requireWorkspace: vi.fn(),
}))
vi.mock('@/server/dal/projects', () => ({
  getProject: vi.fn(),
}))
// Mock CanvasRoom — we test that Echo passes the right props, not that the canvas renders
vi.mock('@/features/canvas/canvas-room', () => ({
  CanvasRoom: vi.fn(({ roomId, fallbackElements }) => (
    <div data-testid="canvas-room" data-room-id={roomId} data-fallback-count={fallbackElements.length} />
  )),
}))

import { render, screen } from '@testing-library/react'
import CanvasPage from './page'

describe('CanvasPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls requireWorkspace with the slug from params', async () => {
    const { requireWorkspace } = await import('@/server/dal/workspaces')
    const { getProject } = await import('@/server/dal/projects')
    ;(requireWorkspace as any).mockResolvedValue({ id: 'ws1', slug: 'acme' })
    ;(getProject as any).mockResolvedValue({
      id: 'p1',
      name: 'Test',
      updatedAt: new Date(),
      liveblocksRoomId: 'proj_p1',
    })

    const page = await CanvasPage({ params: Promise.resolve({ workspaceSlug: 'acme', projectId: 'p1' }) })
    render(page)

    expect(requireWorkspace).toHaveBeenCalledWith('acme')
    expect(getProject).toHaveBeenCalledWith('acme', 'p1')
  })

  it('passes liveblocksRoomId and fallbackElements to CanvasRoom', async () => {
    const { requireWorkspace } = await import('@/server/dal/workspaces')
    const { getProject } = await import('@/server/dal/projects')
    ;(requireWorkspace as any).mockResolvedValue({ id: 'ws1', slug: 'acme' })
    ;(getProject as any).mockResolvedValue({
      id: 'p1',
      name: 'Test',
      updatedAt: new Date(),
      liveblocksRoomId: 'proj_p1',
    })

    const page = await CanvasPage({ params: Promise.resolve({ workspaceSlug: 'acme', projectId: 'p1' }) })
    render(page)

    const canvas = screen.getByTestId('canvas-room')
    expect(canvas).toHaveAttribute('data-room-id', 'proj_p1')
    expect(canvas).toHaveAttribute('data-fallback-count', '0')
  })
})
```

- [ ] **Step 7: Write test for the error boundary**

Create `src/app/(app)/w/[workspaceSlug]/p/[projectId]/error.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import CanvasError from './error'

vi.mock('next/navigation', () => ({
  useParams: () => ({ workspaceSlug: 'acme' }),
}))
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => <a href={href} {...props}>{children}</a>,
}))

describe('CanvasError', () => {
  const mockReset = vi.fn()
  const error = new Error('Canvas crashed')

  it('renders an alert with error message', () => {
    render(<CanvasError error={error} reset={mockReset} />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByText(/canvas failed to load/i)).toBeInTheDocument()
  })

  it('has a try again button that calls reset', () => {
    render(<CanvasError error={error} reset={mockReset} />)
    fireEvent.click(screen.getByRole('button', { name: /try again/i }))
    expect(mockReset).toHaveBeenCalled()
  })

  it('has a back to projects link with correct href', () => {
    render(<CanvasError error={error} reset={mockReset} />)
    const link = screen.getByRole('link', { name: /back to projects/i })
    expect(link).toHaveAttribute('href', '/w/acme')
  })
})
```

- [ ] **Step 8: Run all E2 tests**

Run: `pnpm vitest run src/app/\\(app\\)/w/\\[workspaceSlug\\]/p/\\[projectId\\]/`
Expected: All tests PASS

- [ ] **Step 9: Verify build**

Run: `pnpm build`
Expected: Build succeeds. The canvas page type-checks against the frozen CanvasRoom interface.

- [ ] **Step 10: Commit**

```bash
git add src/stubs/canvas-room.tsx src/stubs/dal-snapshot.ts \
  src/app/\(app\)/w/\[workspaceSlug\]/p/ 
git commit -m "feat(echo): E2 canvas page wiring with error boundary and outage fallback path"
```

- [ ] **Step 11: Wire real CanvasRoom when Bravo B3 merges**

When Bravo merges B3:

1. Delete `src/stubs/canvas-room.tsx`
2. Verify `src/features/canvas/canvas-room.tsx` exports `CanvasRoom` with the frozen signature: `(props: { roomId: string; fallbackElements: unknown[] }) => JSX.Element`
3. The import in `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx` already points to `@/features/canvas/canvas-room` — no path change needed
4. Run: `pnpm vitest run` — all tests pass
5. Run: `pnpm build` — succeeds
6. Commit stub deletion in the same commit as the rebase

- [ ] **Step 12: Wire real getProjectWithSnapshot when Charlie adds it**

When Charlie adds the snapshot function:

1. Delete `src/stubs/dal-snapshot.ts`
2. Update `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx`:

```tsx
import { requireWorkspace } from '@/server/dal/workspaces'
import { getProjectWithSnapshot } from '@/server/dal/projects'
import { CanvasRoom } from '@/features/canvas/canvas-room'

export default async function CanvasPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>
}) {
  const { workspaceSlug, projectId } = await params
  const workspace = await requireWorkspace(workspaceSlug)
  const project = await getProjectWithSnapshot(workspace.slug, projectId)

  return (
    <CanvasRoom
      roomId={project.liveblocksRoomId}
      fallbackElements={project.snapshotElements}
    />
  )
}
```

3. Update the test to assert `fallbackElements` receives the snapshot data
4. Run: `pnpm vitest run` — all tests pass
5. Commit

- [ ] **Step 13: Verify the new-user onboarding flow compiles end-to-end**

The full new-user flow across Echo's pages:

1. User signs up → Clerk handles via `(auth)/sign-up` (Charlie owns those pages)
2. User lands in `choose-organization` session task → Clerk redirects to `/session-tasks/choose-organization` (our page from E0, renders `<TaskChooseOrganization />`)
3. User creates a workspace (org) via the Clerk component
4. Clerk webhook fires → Charlie's webhook handler creates `Workspace` row in Postgres
5. User is redirected to `/w/{orgSlug}` → our project list page (E1)
6. `requireWorkspace(orgSlug)` lazy-upserts if the webhook hasn't arrived yet
7. User sees empty project list, clicks "New project"
8. Create modal → server action → DAL `createProject` → redirects to `/w/{slug}/p/{id}`
9. Canvas page (E2) renders `<CanvasRoom>`

Verify this compiles:
- `src/app/session-tasks/choose-organization/page.tsx` imports `TaskChooseOrganization` from `@clerk/nextjs`
- `src/app/(app)/w/[workspaceSlug]/page.tsx` calls `requireWorkspace` then `listProjects`
- `src/app/(app)/w/[workspaceSlug]/p/[projectId]/page.tsx` calls `requireWorkspace` then `getProject` then renders `<CanvasRoom>`

Run: `pnpm build`
Expected: Build succeeds

---
