# LiveFlows Marketing Navigation & Theme Design System

## Visual Identity: DeepSeek Electric Blue Glass

A high-precision developer aesthetic combining obsidian pitch-black backgrounds, electric ice blue glowing accents, volumetric atmospheric light fields, and floating frosted glass navigation with interactive multi-column mega-menus.

---

## 1. Color Tokens & Glass Materials

| Role | Value | Usage |
|---|---|---|
| **Base Background** | `#030305` to `#06070a` | Deep obsidian canvas background |
| **Electric Blue Accent** | `#679EFE` | Primary CTA hover, active pills, status indicators |
| **Volumetric Deep Blue** | `#1A3870` / `#2D5F9E` | Ambient background radial lighting fields |
| **Volumetric Cyan/Sky** | `#4A8AC4` / `#60A5FA` | Atmospheric particle aura & specular highlights |
| **Glass Surface (Bar)** | `rgba(9, 11, 16, 0.65)` | Frosted navigation bar backdrop with `backdrop-blur-2xl` |
| **Glass Dropdown Panel**| `rgba(9, 11, 16, 0.92)` | Multi-column mega menu container with `backdrop-blur-3xl` |
| **Glass Hairline Border**| `rgba(255, 255, 255, 0.12)` | Subtle specular reflection on card & nav boundaries |
| **Glass Hover Sheen** | `rgba(103, 158, 254, 0.12)` | Interactive item hover background |

---

## 2. Navigation Mega-Menu Architecture

The floating glass header contains 3 interactive drop-down panels:

### Menu 1: Architecture (`#architecture`)
* **Realtime Write Path**: Liveblocks CRDT `LiveMap` storage with throttled 100ms diffs & sub-15ms broadcast latency.
* **Deterministic Reconciliation**: Pure `elementSync.ts` engine merging by `version` with `versionNonce` tie-breaking.
* **Postgres Read Mirror**: 60s background daemon keeping `CanvasSnapshot` ready for instant project queries.
* **Clerk Organization Boundary**: Strict DAL session verification with zero URL existence leaks.
* *Footer Bar*: Direct link to interactive blueprint simulator.

### Menu 2: AI MCP Agents (`#modes`)
* **Model Context Protocol (MCP)**: Programmatic architecture reading & diagram synthesis for Claude, Cursor, and Codex.
* **Tool Schema Specs**: Structured JSON tool definitions for querying nodes, calculating layout, and inserting services.
* **CLI Quick Connect**: One-line command execution via `npx @liveflows/mcp connect`.
* *Footer Bar*: Direct link to MCP developer documentation.

### Menu 3: Resources & Specs (`#benchmarks`)
* **Developer Quickstart**: Scaffold collaborative rooms with Next.js 16 and Liveblocks.
* **Technical Benchmarks**: Comparative analysis vs naive DB polling and heavy Yjs binary stacks.
* **GitHub Repository**: Open source codebase, issues, and contributing guides.
* **System Health & Telemetry**: Operational status and live sync monitoring.

---

## 3. Interaction & Motion Physics
* **Dropdown Transition**: Smooth cubic bezier ease-out downward slide (`translate-y-0 opacity-100` from `translate-y-2 opacity-0`).
* **Hover Retention**: Debounced mouse leave timer (150ms) to ensure smooth cursor transitions between menu triggers and drop panels.
* **Click & Keyboard Accessibility**: Fully accessible via keyboard navigation, ESC key dismissal, and mobile drawer support.
