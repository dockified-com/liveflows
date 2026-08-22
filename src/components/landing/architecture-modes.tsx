"use client";

import { useState } from "react";

type ModeKey = "human" | "mcp" | "snapshot";

interface ModeDetail {
  id: ModeKey;
  number: string;
  title: string;
  badge: string;
  description: string;
  codeSnippet: string;
  codeLanguage: string;
  highlightedLine: string;
}

const MODES: ModeDetail[] = [
  {
    id: "human",
    number: "01",
    title: "Multiplayer Canvas Mode",
    badge: "Excalidraw + Liveblocks",
    description:
      "Engineers brainstorm in realtime. Canvas elements are synchronized through pure LWW reconciliation (version + versionNonce) with multi-cursor presence and zero state drift.",
    codeLanguage: "typescript",
    highlightedLine: "mergeByVersionNonce(localElements, remoteElements)",
    codeSnippet: `// src/features/canvas/element-sync.ts (Pure Functional Engine)
export function reconcileElements(
  current: readonly ExcalidrawElement[],
  incoming: readonly ExcalidrawElement[]
): ExcalidrawElement[] {
  const map = new Map(current.map((el) => [el.id, el]));
  for (const inc of incoming) {
    const existing = map.get(inc.id);
    if (!existing || inc.version > existing.version) {
      map.set(inc.id, inc);
    } else if (inc.version === existing.version) {
      // Tie-breaker: deterministic versionNonce comparison
      if (inc.versionNonce > existing.versionNonce) {
        map.set(inc.id, inc);
      }
    }
  }
  return Array.from(map.values());
}`,
  },
  {
    id: "mcp",
    number: "02",
    title: "Autonomous MCP Agent Mode",
    badge: "Model Context Protocol",
    description:
      "External AI coding agents (Claude, Cursor, Codex) connect via MCP to read system topology, inspect edge connections, and programmatically insert microservices into the canvas.",
    codeLanguage: "json",
    highlightedLine: '"tool": "liveflows_upsert_service_node"',
    codeSnippet: `{
  "protocol": "mcp/1.0",
  "method": "tools/call",
  "params": {
    "name": "liveflows_upsert_service_node",
    "arguments": {
      "roomId": "payments-platform-v2",
      "service": {
        "id": "node_auth_service",
        "type": "rectangle",
        "label": "Auth Edge Service (JWT / OAuth2)",
        "position": { "x": 420, "y": 280 },
        "connectsTo": ["node_api_gateway", "node_postgres_db"]
      }
    }
  }
}`,
  },
  {
    id: "snapshot",
    number: "03",
    title: "Postgres Mirror & Outage Mode",
    badge: "Prisma 7 Snapshot Daemon",
    description:
      "Project lists, search, and cold boots read directly from Postgres without hitting Liveblocks. If realtime sockets degrade, canvas seamlessly loads cached snapshot with graceful read-only fallback.",
    codeLanguage: "typescript",
    highlightedLine: "findUnique({ where: { id: projectId } })",
    codeSnippet: `// src/server/dal/projects.ts (Membership Proven Read Path)
export async function getProjectWithSnapshot(projectId: string) {
  const { orgId } = await requireWorkspace(); // Enforces Clerk session

  const project = await prisma.project.findUnique({
    where: { id: projectId, orgId },
    include: {
      snapshot: {
        select: { elements: true, updatedAt: true, appState: true }
      }
    }
  });

  if (!project) throw new NotFoundError("Project not found");
  return project;
}`,
  },
];

export function ArchitectureModes() {
  const [activeMode, setActiveMode] = useState<ModeKey>("human");

  const currentMode = MODES.find((m) => m.id === activeMode) || MODES[0];

  return (
    <section
      id="modes"
      className="relative scroll-mt-32 py-24 lg:py-32 bg-transparent border-t border-white/[0.08]"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Eyebrow and Heading */}
        <div className="flex flex-col items-start max-w-3xl">
          <div
            className="inline-flex items-center rounded-full p-[1px] mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.4) 100%)",
            }}
          >
            <span className="rounded-full bg-[#0c0c0e] px-3 py-1 font-mono text-[11px] font-medium tracking-wider uppercase text-zinc-300">
              Runtime Architecture Modes
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Everything is a protocol.
            <span className="text-zinc-500 block font-normal mt-1">
              Every interaction is deterministic.
            </span>
          </h2>
        </div>

        {/* Split Grid: Left Mode Selector | Right Code/Spec Workbench */}
        <div className="mt-14 grid grid-cols-1 lg:grid-cols-[45fr_55fr] gap-8 items-start">
          {/* Left Column: Mode Pickers */}
          <div className="flex flex-col gap-4">
            {MODES.map((mode) => {
              const isActive = activeMode === mode.id;
              return (
                <button
                  type="button"
                  key={mode.id}
                  onClick={() => setActiveMode(mode.id)}
                  className={`group text-left cursor-pointer rounded-2xl p-6 transition-all ${
                    isActive ? "glass-card-active" : "glass-card"
                  }`}
                  style={{
                    backgroundColor: isActive
                      ? "rgba(12, 18, 32, 0.9)"
                      : "rgba(8, 11, 18, 0.75)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    border: isActive
                      ? "1px solid #679efe"
                      : "1px solid rgba(255, 255, 255, 0.08)",
                    boxShadow: isActive
                      ? "0 10px 40px rgba(0, 0, 0, 0.7), 0 0 35px rgba(103, 158, 254, 0.25)"
                      : "0 10px 30px rgba(0, 0, 0, 0.5)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-[#679efe]">
                      MODE {mode.number}
                    </span>
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-[10px] ${
                        isActive
                          ? "bg-[#679efe] text-black font-semibold shadow-[0_0_12px_rgba(103,158,254,0.5)]"
                          : "bg-white/[0.05] text-zinc-400"
                      }`}
                    >
                      {mode.badge}
                    </span>
                  </div>

                  <h3
                    className={`mt-2 font-mono text-lg font-semibold transition-colors ${
                      isActive
                        ? "text-white"
                        : "text-zinc-300 group-hover:text-white"
                    }`}
                  >
                    {mode.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-400 font-sans">
                    {mode.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Right Column: Code & Protocol Workbench */}
          <div
            className="sticky top-28 overflow-hidden rounded-2xl glass-terminal"
            style={{
              backgroundColor: "rgba(8, 11, 18, 0.95)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow:
                "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
            }}
          >
            {/* Workbench Top Bar */}
            <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-[#679efe] shadow-[0_0_8px_rgba(103,158,254,0.8)]" />
                <span className="font-mono text-xs text-zinc-200">
                  {currentMode.title} Specification
                </span>
              </div>
              <span className="font-mono text-[11px] text-[#679efe] uppercase">
                {currentMode.codeLanguage}
              </span>
            </div>

            {/* Code Body */}
            <div className="p-5 font-mono text-xs leading-relaxed text-zinc-300 overflow-x-auto">
              <pre className="whitespace-pre">{currentMode.codeSnippet}</pre>
            </div>

            {/* Spec Footnote */}
            <div className="border-t border-white/[0.06] bg-white/[0.01] px-5 py-3 flex items-center justify-between font-mono text-[11px] text-zinc-500">
              <span>Verified contract</span>
              <span className="text-emerald-400">Zero drift guarantee</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
