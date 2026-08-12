# LiveFlows Design System (Light SaaS)

## Overview

LiveFlows uses a clean, utilitarian Light SaaS design system focused on legibility, whitespace, and immediate multiplayer clarity. The system is extracted from the approved visual direction in `docs/UI-design/final-light-saas/`.

All authenticated application surfaces MUST follow these specifications. Dark industrial tokens (`#0E1117`), orange (`#FF9E00`), and purple gradients are explicitly prohibited in the authenticated UI.

---

## 1. Color Tokens & Semantic Roles

All colors are declared as CSS custom properties in `src/app/globals.css` and mapped to Tailwind v4 theme variables. Raw hex codes in JSX are strictly forbidden (except where required by 3rd-party canvas rendering).

| Variable | Hex / Value | Semantic Role |
|---|---|---|
| `--bg` / `color-bg` | `#F8FAFC` | Main application canvas background |
| `--card` / `color-card` | `#FFFFFF` | Elevate surface (Nav, Rail, Cards, Modals) |
| `--bg-2` / `color-bg-2` | `#F1F5F9` | Secondary background (Active hover, Tab bar background) |
| `--line` / `color-line` | `#E2E8F0` | Dividers, card borders, input borders |
| `--ink` / `color-ink` | `#1E293B` | Primary text, titles, headings |
| `--ink-soft` / `color-ink-soft` | `#64748B` | Secondary text, navigation labels, subheadings |
| `--ink-faint` / `color-ink-faint` | `#94A3B8` | Metadata, timestamps, breadcrumbs, placeholder text |
| `--accent` / `color-accent` | `#2563EB` | Primary CTA, active tab indicator, selected items |
| `--accent-hover` / `color-accent-hover` | `#1D4ED8` | Primary button hover state |
| `--accent-soft` / `color-accent-soft` | `#EFF6FF` | Soft accent background for active rail item, selected rows |
| `--success` / `color-success` | `#16A34A` | Synced status, active connections, positive indicators |
| `--success-soft` / `color-success-soft` | `#F0FDF4` | Background for success pills and badges |
| `--warn` / `color-warn` | `#D97706` | Reconnecting state, cached snapshot warning |
| `--warn-soft` / `color-warn-soft` | `#FFFBEB` | Background for warning banners and pills |
| `--destructive` / `color-destructive` | `#DC2626` | Delete actions, critical errors, disconnect alert |
| `--destructive-soft` / `color-destructive-soft` | `#FEF2F2` | Background for error pills and delete confirms |

### Elevation & Shadows
- **Default Card Shadow (`--shadow`)**: `0 1px 2px rgba(15,23,42,.04), 0 1px 3px rgba(15,23,42,.06)`
- **Hover Card Shadow**: `0 4px 12px rgba(15,23,42,.08)`
- **Modal / Dialog Shadow**: `0 20px 25px -5px rgba(15,23,42,.1), 0 8px 10px -6px rgba(15,23,42,.1)`

### Border Radius
- **Card / Container Radius (`--radius`)**: `12px` (`rounded-xl`)
- **Button / Input / Small Radius (`--radius-sm`)**: `8px` (`rounded-lg`)
- **Pill / Badge Radius**: `9999px` (`rounded-full`)

---

## 2. Typography & Scale

The system relies exclusively on Next.js `next/font/google` loading for **Geist** (`font-sans`) and **Geist Mono** (`font-mono`).

| Style Role | Font | Size | Weight | Line Height | Usage |
|---|---|---|---|---|---|
| Page Title | Geist | 24px (1.5rem) | 700 Bold | 1.2 | Workspace title, main view headers |
| Document Title | Geist | 26px (1.625rem) | 700 Bold | 1.25 | Embedded document title |
| Section Header | Geist | 17px (1.0625rem)| 600 Semibold | 1.3 | Doc H2, modal header |
| Card Title | Geist | 15px (0.9375rem)| 600 Semibold | 1.35 | Project card heading |
| Body Text | Geist | 14px (0.875rem) | 400 Regular | 1.5 | Standard copy, forms, dialogue |
| Nav / Button | Geist | 13.5px / 13px | 500 Medium | 1.4 | Nav items, buttons, tabs |
| Metadata / Meta | Geist | 12px (0.75rem) | 400 / 500 | 1.4 | Project timestamp, status pills |
| Section Label | Geist | 11px (0.6875rem)| 600 Semibold | 1.2 | Uppercase sidebar section titles (`tracking-wider`) |
| Rail Label | Geist | 10.5px | 500 Medium | 1.2 | Icon rail item caption |
| Code / Spec | Geist Mono | 11.5px / 13px | 400 Regular | 1.4 | Technical notes, room IDs, status logs |

---

## 3. Spacing Scale

Built on a strict 4px grid:
`4px (1)` · `8px (2)` · `12px (3)` · `16px (4)` · `20px (5)` · `24px (6)` · `28px (7)` · `32px (8)` · `40px (10)` · `48px (12)`

- **Rail Item Padding**: `16px 0`, gap `4px`
- **Sidebar Padding**: `20px 14px`
- **Topbar Padding**: `0 28px` (Workspace), `0 20px` (Canvas)
- **Content Container Padding**: `28px`

---

## 4. Inline SVG Icon System

Icons must be built with inline SVG wrappers (`src/components/ui/icon.tsx`).

### Rules:
- **Stroke Width**: `1.5px` (default) or `1.75px` (emphasized/interactive).
- **Stroke Color**: `currentColor` (allows text color inheritance).
- **Bounding Box**: `16px` (sm), `18px` (default/rail), `20px` (lg).
- **Fill**: `none` (line icons only, except explicit dot indicators).
- **Accessibility**: Include `aria-hidden="true"` when accompanied by visible text; require `aria-label` when standalone.

---

## 5. Component Vocabulary

### App Rail (`src/components/ui/app-rail.tsx`)
- Fixed width `72px`, white background (`--card`), 1px right border (`--line`).
- Logo badge: 32x32px, blue background (`--accent`), bold centered initials.
- Rail item: 52x52px, 8px radius, text color `--ink-faint`. Active item turns `--accent` on `--accent-soft` background.

### Workspace Sidebar (`src/components/ui/workspace-sidebar.tsx`)
- Fixed width `240px`, white background (`--card`), 1px right border (`--line`).
- Workspace switcher: 28x28px avatar + workspace name + chevron caret.
- Section label: 11px bold uppercase `--ink-faint`.
- Nav item: 8px padding, 8px radius. Active item has `--accent-soft` background and `--accent` medium text.

### File Tree (`src/components/ui/file-tree.tsx`)
- Hierarchical node tree with caret toggles.
- Node height: 28px, 6px border-radius, left margin `20px` per nesting level.
- File icons: purple (`#6366F1`) for `.doc` files, blue (`--accent`) for `.canvas` files.

### Topbar & Breadcrumbs (`src/components/ui/topbar.tsx`)
- Height `64px` (Workspace) or `56px` (Canvas).
- Breadcrumb format: `Workspace > organization-name > project-name` with faint chevrons/slashes and bold active title.

### Project Card (`src/components/ui/project-card.tsx`)
- White card with `--shadow` and 12px border radius.
- Hover effect: `transform: scale(1.02)` with `shadow-md`.
- Head: 38x38px icon box in `--accent-soft` + 15px semibold title + updated timestamp.
- Foot: Status pill (`Synced` / `Local`) + Multiplayer presence avatar stack.

### Tab Bar & Split View (`src/components/ui/tab-bar.tsx`)
- Height `40px`, background `--bg-2`.
- Active tab: background `--card`, active bottom indicator line (2px `--accent`).
- Tab close button: 16x16px hoverable square.
- Drop zone overlay: dashed blue border overlay (`rgba(37,99,235,.18)`).

### Status Pill (`src/components/ui/status-pill.tsx`)
- Inline flex badge, `rounded-full`, 4px 9px padding, font size 12px medium.
- Variants:
  - **Synced / Active**: `--success-soft` background, `--success` text + 6px green dot.
  - **Reconnecting / Warning**: `--warn-soft` background, `--warn` text + pulsing amber dot.
  - **Disconnected / Offline**: `--destructive-soft` background, `--destructive` text + red dot.

### Presence Avatar Stack (`src/components/ui/presence-stack.tsx`)
- Overlapping 22px / 26px circular avatars with 2px white border.
- `-6px` or `-8px` negative left margin for stack effect.

### Primitive UI Components (`src/components/ui/`)
1. **Button (`button.tsx`)**:
   - `primary`: `--accent` bg, white text, hover `--accent-hover`, subtle shadow.
   - `secondary`: `--card` bg, `--line` border, `--ink` text, hover `--bg-2`.
   - `ghost`: transparent bg, `--ink-soft` text, hover `--bg-2`.
   - `destructive`: `--destructive` bg, white text, hover red-700.
2. **Input (`input.tsx`)**:
   - Visible label in `--ink` (13px medium).
   - Input: 1px `--line` border, 8px radius, focus ring 2px `--accent-soft` + `--accent` border.
3. **Modal / Dialog (`modal-dialog.tsx`)**:
   - Fixed overlay `rgba(15,23,42,0.4)` backdrop blur.
   - Centered white dialog box (`max-w-md`), 12px radius, header + body + actions footer.
4. **Empty State (`empty-state.tsx`)**:
   - Dashed border card or centered illustration container.
   - 15px title, 14px faint subtitle, primary CTA button.
5. **Inline Error (`inline-error.tsx`)**:
   - Red/amber soft panel with warning icon, clean message, optional retry button.

---

## 6. Interaction & State Language

- **Loading State**: Clean Skeleton pulses (`bg-slate-200 animate-pulse rounded-md`) matching component dimensions.
- **Empty State**: Guided action card with clear CTA (e.g., "+ New project").
- **Error State**: Inline error alert with non-blocking feedback.
- **Offline / Degraded**: Read-only warning banner at top of canvas (`--warn-soft` background, `#92400E` text) explaining snapshot mode.

---

## 7. Accessibility (WCAG AA) & Keyboard Nav

- **Contrast Ratios**:
  - Primary text (`--ink` `#1E293B`) on `--bg` (`#F8FAFC`): **11.8:1** (Passes AAA).
  - Secondary text (`--ink-soft` `#64748B`) on `--bg`: **4.8:1** (Passes AA).
  - Faint text (`--ink-faint` `#94A3B8`) used ONLY for non-essential metadata and placeholders.
  - Accent button (`#2563EB`) white text: **4.6:1** (Passes AA).
- **Focus Rings**: `focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-2`.
- **Keyboard ARIA**: Full keyboard support for tab controls (`role="tablist"`), trees (`role="tree"`), dialogs (`role="dialog" aria-modal="true"`).

---

## 8. Anti-Slop Rejection List

The following anti-patterns are strictly rejected:
1. ❌ **No dark mode backgrounds** (`#0E1117`, `#161B22`) in authenticated app screens.
2. ❌ **No purple, neon, or gradient backgrounds/borders**.
3. ❌ **No generic icon dumps** without explicit 1.5-1.75px stroke & `currentColor` styling.
4. ❌ **No unstyled third-party UI components** or un-themed component libraries.
5. ❌ **No raw hex codes in JSX** (always use CSS variables/Tailwind semantic utility classes).
6. ❌ **No blurry glassmorphism floating cards** or arbitrary deep drop-shadows.
