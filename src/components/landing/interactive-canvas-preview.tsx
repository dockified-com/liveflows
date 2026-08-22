"use client";

import { useState } from "react";

type FlowMode = "write" | "read" | "mcp";

interface NodeDetails {
  title: string;
  role: string;
  badge: string;
  latency: string;
  spec: string;
  description: string;
}

const NODES_DATA: Record<string, NodeDetails> = {
  client: {
    title: "Client Web App",
    role: "Excalidraw Canvas UI",
    badge: "Active Presence (4 users)",
    latency: "<5ms input",
    spec: "React 19 + Zustand Ephemeral UI State",
    description:
      "Engineers draw architecture diagrams with zero frame drops. Canvas elements are diffed by version and broadcast to peers via Liveblocks Storage.",
  },
  gateway: {
    title: "API Gateway",
    role: "Next.js 16 Edge Proxy & DAL",
    badge: "Session Verified",
    latency: "8ms",
    spec: "proxy.ts + src/server/dal/workspaces.ts",
    description:
      "All requests verify Clerk Organization membership inside the DAL query. Non-members receive NotFoundError with zero existence leaks.",
  },
  liveblocks: {
    title: "Liveblocks Room",
    role: "Authoritative Write Path",
    badge: "CRDT LiveMap",
    latency: "12ms broadcast",
    spec: "VersionNonce LWW Conflict-Free Sync",
    description:
      "Liveblocks Storage is the sole source of truth during live brainstorming. Element mutations write to LiveMap, broadcasting to all connected sockets.",
  },
  postgres: {
    title: "Postgres Mirror",
    role: "Authoritative Read Path",
    badge: "Prisma 7 + PG Driver",
    latency: "Sub-millisecond read",
    spec: "CanvasSnapshot 60s Debounced Webhook",
    description:
      "Project lists, search, and cold-start previews read directly from Postgres. Kept eventually consistent by the Liveblocks storageUpdated webhook.",
  },
  mcp: {
    title: "AI MCP Agent",
    role: "External Model Context Protocol",
    badge: "Claude / Cursor / Codex",
    latency: "Tool execution ~40ms",
    spec: "@modelcontextprotocol/sdk",
    description:
      "AI coding agents inspect system architecture diagrams, query component topologies, and programmatically insert new services directly into the canvas.",
  },
};

export function InteractiveCanvasPreview() {
  const [activeFlow, setActiveFlow] = useState<FlowMode>("write");
  const [selectedNode, setSelectedNode] = useState<string>("liveblocks");

  const currentNode = NODES_DATA[selectedNode] || NODES_DATA.liveblocks;

  return (
    <section
      id="architecture"
      className="relative scroll-mt-24 py-16 lg:py-24 border-t border-b border-white/[0.08] bg-[#070709]/70 backdrop-blur-lg"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className="inline-flex items-center rounded-full p-[1px] mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.4) 100%)",
            }}
          >
            <span className="rounded-full bg-[#0c0c0e] px-3 py-1 font-mono text-[11px] font-medium tracking-wider uppercase text-zinc-300">
              System Topology & Data Flow
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Live Architecture Blueprint
          </h2>
          <p className="mt-4 max-w-2xl text-base text-zinc-400 font-sans">
            Inspect the high-throughput dual-path pipeline. Liveblocks handles
            sub-15ms canvas writes; Postgres provides instantaneous reads and
            outage resilience.
          </p>
        </div>

        {/* Simulator Frame */}
        <div className="glass-terminal mt-12 overflow-hidden rounded-2xl">
          {/* Simulator Controls & Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.08] bg-white/[0.02] px-6 py-3.5">
            {/* Simulation Flow Modes */}
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-500 uppercase tracking-wider hidden sm:inline">
                Simulate Path:
              </span>
              <div className="flex items-center rounded-lg border border-white/10 bg-[#070709] p-1 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => setActiveFlow("write")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    activeFlow === "write"
                      ? "bg-white text-black font-semibold shadow-[0_0_15px_rgba(103,158,254,0.3)]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Write Path (Liveblocks)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow("read")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    activeFlow === "read"
                      ? "bg-white text-black font-semibold shadow-[0_0_15px_rgba(103,158,254,0.3)]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  Read Path (Postgres)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFlow("mcp")}
                  className={`rounded-lg px-3 py-1 transition-all ${
                    activeFlow === "mcp"
                      ? "bg-white text-black font-semibold shadow-[0_0_15px_rgba(103,158,254,0.3)]"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  MCP Agent Path
                </button>
              </div>
            </div>

            {/* Live Telemetry Ticker with Electric Blue / Emerald indicator */}
            <div className="flex items-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                <span>4 collaborators live</span>
              </div>
              <div className="hidden md:flex items-center gap-1 text-zinc-400">
                <span className="text-zinc-500">Sync:</span>
                <span className="text-[#679efe] font-semibold">11ms</span>
              </div>
              <div className="hidden lg:flex items-center gap-1 text-zinc-400">
                <span className="text-zinc-500">Mirror:</span>
                <span className="text-zinc-200">synced 18s ago</span>
              </div>
            </div>
          </div>

          {/* Main Visual Interactive Blueprint */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px]">
            {/* Left Blueprint Canvas */}
            <div className="relative min-h-[460px] overflow-hidden bg-[#09090c] p-6 sm:p-8">
              {/* Architectural Grid Background */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:32px_32px]" />

              {/* Connecting Vector Lines SVG */}
              <svg
                className="absolute inset-0 h-full w-full pointer-events-none"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Client -> Gateway */}
                <path
                  d="M 170 120 C 230 120, 240 180, 290 180"
                  fill="none"
                  stroke={
                    activeFlow === "write" || activeFlow === "read"
                      ? "#ffffff"
                      : "#27272a"
                  }
                  strokeWidth="1.5"
                  strokeDasharray={activeFlow === "write" ? "4 4" : undefined}
                />

                {/* Gateway -> Liveblocks */}
                <path
                  d="M 430 180 C 480 180, 480 120, 530 120"
                  fill="none"
                  stroke={activeFlow === "write" ? "#10b981" : "#27272a"}
                  strokeWidth={activeFlow === "write" ? "2" : "1.5"}
                  strokeDasharray={activeFlow === "write" ? "5 5" : undefined}
                />

                {/* Liveblocks -> Postgres (Mirror Webhook) */}
                <path
                  d="M 610 170 C 610 260, 520 320, 430 320"
                  fill="none"
                  stroke={activeFlow === "read" ? "#ffffff" : "#3f3f46"}
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />

                {/* Gateway -> Postgres (Read Query) */}
                <path
                  d="M 360 230 L 360 280"
                  fill="none"
                  stroke={activeFlow === "read" ? "#10b981" : "#27272a"}
                  strokeWidth={activeFlow === "read" ? "2" : "1.5"}
                />

                {/* MCP Agent -> Gateway/Liveblocks */}
                <path
                  d="M 170 320 C 240 320, 260 210, 290 190"
                  fill="none"
                  stroke={activeFlow === "mcp" ? "#ffffff" : "#27272a"}
                  strokeWidth={activeFlow === "mcp" ? "2" : "1.5"}
                  strokeDasharray={activeFlow === "mcp" ? "4 4" : undefined}
                />
              </svg>

              {/* Node 1: Client Web App */}
              <button
                type="button"
                onClick={() => setSelectedNode("client")}
                className={`absolute left-6 top-16 z-10 w-44 text-left cursor-pointer rounded-xl p-4 transition-all ${
                  selectedNode === "client" ? "glass-card-active" : "glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#679efe]">
                    CLIENT LAYER
                  </span>
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-white">
                  Client Web App
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Excalidraw + 4 Cursors
                </p>
              </button>

              {/* Node 2: API Gateway */}
              <button
                type="button"
                onClick={() => setSelectedNode("gateway")}
                className={`absolute left-1/2 top-32 z-10 w-48 -translate-x-1/2 text-left cursor-pointer rounded-xl p-4 transition-all ${
                  selectedNode === "gateway"
                    ? "glass-card-active"
                    : "glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#679efe]">
                    EDGE ROUTE
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                    proxy.ts
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-white">
                  API Gateway
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Clerk DAL Session Guard
                </p>
              </button>

              {/* Node 3: Liveblocks Room */}
              <button
                type="button"
                onClick={() => setSelectedNode("liveblocks")}
                className={`absolute right-6 top-16 z-10 w-48 text-left cursor-pointer rounded-xl p-4 transition-all ${
                  selectedNode === "liveblocks"
                    ? "glass-card-active"
                    : "glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#679efe]">
                    WRITE PATH
                  </span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#679efe] animate-pulse" />
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-white">
                  Liveblocks Room
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  LiveMap CRDT Storage
                </p>
              </button>

              {/* Node 4: Postgres Mirror */}
              <button
                type="button"
                onClick={() => setSelectedNode("postgres")}
                className={`absolute left-1/2 bottom-8 z-10 w-48 -translate-x-1/2 text-left cursor-pointer rounded-xl p-4 transition-all ${
                  selectedNode === "postgres"
                    ? "glass-card-active"
                    : "glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#679efe]">
                    READ PATH
                  </span>
                  <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] text-zinc-300">
                    Prisma 7
                  </span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-white">
                  Postgres Mirror
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  CanvasSnapshot (60s loop)
                </p>
              </button>

              {/* Node 5: MCP AI Agent */}
              <button
                type="button"
                onClick={() => setSelectedNode("mcp")}
                className={`absolute left-6 bottom-8 z-10 w-44 text-left cursor-pointer rounded-xl p-4 transition-all ${
                  selectedNode === "mcp" ? "glass-card-active" : "glass-card"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-[#679efe]">
                    AI AGENT MCP
                  </span>
                  <span className="text-[11px]">🤖</span>
                </div>
                <p className="mt-1 font-mono text-sm font-semibold text-white">
                  AI MCP Agent
                </p>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Read & Mutate Canvas
                </p>
              </button>
            </div>

            {/* Right Node Inspector Sidebar */}
            <div className="border-t lg:border-t-0 lg:border-l border-white/[0.08] bg-[#0c0c10] p-6">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                  Component Inspector
                </span>
                <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                  {currentNode.badge}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="font-mono text-base font-semibold text-white">
                  Node: {currentNode.title}
                </h3>
                <p className="mt-0.5 font-mono text-xs text-zinc-400">
                  {currentNode.role}
                </p>

                <div className="mt-4 space-y-2.5 font-mono text-xs">
                  <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase">
                      Latency / Perf
                    </p>
                    <p className="mt-0.5 text-emerald-400">
                      {currentNode.latency}
                    </p>
                  </div>
                  <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="text-[10px] text-zinc-500 uppercase">
                      Technical Spec
                    </p>
                    <p className="mt-0.5 text-zinc-300 break-all">
                      {currentNode.spec}
                    </p>
                  </div>
                </div>

                <p className="mt-4 text-xs leading-relaxed text-zinc-400">
                  {currentNode.description}
                </p>

                <div className="mt-6 border-t border-white/[0.08] pt-4">
                  <p className="font-mono text-[11px] text-zinc-500">
                    💡 Click any node on the blueprint canvas to inspect its
                    protocol details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
