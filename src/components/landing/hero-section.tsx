"use client";

import Link from "next/link";
import { useState } from "react";
import { AtmosphericBackground } from "./atmospheric-background";

const TERMINAL_COMMANDS = {
  quickstart: "pnpm dlx create-liveflows-app@latest",
  mcp: "npx @liveflows/mcp connect --room sys-architecture",
  clone:
    "git clone https://github.com/dockified/liveflows.git && cd liveflows && pnpm install",
};

export function HeroSection() {
  const [activeTab, setActiveTab] = useState<"quickstart" | "mcp" | "clone">(
    "quickstart",
  );
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(TERMINAL_COMMANDS[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28">
      {/* DeepSeek Harness Atmospheric Background strictly scoped to Hero section */}
      <AtmosphericBackground />
      {/* Background Engineering Hairline Grid & Subtle Ambient Mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.15]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
          {/* Left Column: Thesis & Pitch */}
          <div className="flex flex-col items-start">
            {/* Iridescent Eyebrow Badge with DeepSeek Electric Blue */}
            <div
              className="inline-flex items-center rounded-full p-[1px] mb-6"
              style={{
                background:
                  "linear-gradient(135deg, rgba(103,158,254,0.9) 0%, rgba(255,255,255,0.25) 35%, rgba(26,56,112,0.4) 65%, rgba(103,158,254,0.7) 100%)",
                boxShadow:
                  "0 0 20px rgba(103,158,254,0.25), 0 0 35px rgba(45,95,158,0.15)",
              }}
            >
              <span className="flex items-center gap-2 rounded-full bg-[#080b12]/80 backdrop-blur-md px-3.5 py-1 font-mono text-xs font-medium text-zinc-200">
                <span className="h-1.5 w-1.5 rounded-full bg-[#679efe] animate-pulse" />
                SYSTEM DESIGN = CANVAS + REALTIME ENGINE + READ MIRROR
              </span>
            </div>

            {/* H1 Heading */}
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl lg:text-[58px] leading-[1.1] text-balance">
              Where engineers and AI agents{" "}
              <span className="text-[#9abcfc] block font-normal">
                design distributed systems together in realtime.
              </span>
            </h1>

            {/* Subtitle / Value Proposition */}
            <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-zinc-400 sm:text-lg">
              The collaborative diagramming engine powered by deterministic CRDT
              reconciliation and Model Context Protocol — so software teams and
              autonomous AI agents build architectures in lockstep.
            </p>

            {/* CTAs with Electric Blue Glow */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link
                href="/sign-up"
                className="group relative inline-flex items-center justify-center rounded-xl border border-white/30 bg-white px-5 py-3 font-mono text-xs font-semibold text-black transition-all hover:bg-[#e6eeff] hover:shadow-[0_0_35px_rgba(103,158,254,0.4)]"
              >
                START WORKSPACE
                <span
                  aria-hidden="true"
                  className="ml-2 inline-block transition-transform group-hover:translate-x-1 text-[#679efe]"
                >
                  →
                </span>
              </Link>

              <a
                href="#architecture"
                className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 font-mono text-xs font-medium text-zinc-300 backdrop-blur-md transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08] hover:text-white"
              >
                <svg
                  className="mr-2 h-3.5 w-3.5 text-[#679efe]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 16v-4M12 8h.01" />
                </svg>
                VIEW ARCHITECTURE
              </a>

              <a
                href="https://deepseek.com/harness/en/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-[#679efe]/20 bg-[#679efe]/[0.05] px-4 py-3 font-mono text-xs font-medium text-[#9abcfc] backdrop-blur-md transition-all hover:border-[#679efe]/50 hover:bg-[#679efe]/[0.12] hover:text-white"
              >
                <svg
                  className="mr-1.5 h-3.5 w-3.5 text-[#679efe]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
                DEEPSEEK HARNESS ↗
              </a>
            </div>

            {/* Architectural Data Flow Metric Strip */}
            <div className="mt-10 grid w-full max-w-xl grid-cols-3 gap-2.5 font-mono text-[11px]">
              <div
                className="glass-card rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(8, 11, 18, 0.8)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                <p className="text-[10px] tracking-wider uppercase text-zinc-500">
                  WRITE PATH
                </p>
                <p className="mt-1 font-semibold text-[#679efe] flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#679efe]" />
                  LIVEBLOCKS
                </p>
              </div>
              <div
                className="glass-card rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(8, 11, 18, 0.8)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                <p className="text-[10px] tracking-wider uppercase text-zinc-500">
                  READ PATH
                </p>
                <p className="mt-1 font-semibold text-zinc-200">
                  POSTGRES MIRROR
                </p>
              </div>
              <div
                className="glass-card rounded-xl p-3"
                style={{
                  backgroundColor: "rgba(8, 11, 18, 0.8)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
                }}
              >
                <p className="text-[10px] tracking-wider uppercase text-zinc-500">
                  AUTH ISOLATION
                </p>
                <p className="mt-1 font-semibold text-zinc-200">
                  CLERK DAL SESSION
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: DeepSeek-Style Terminal Workbench */}
          <div className="w-full">
            {/* Terminal Container with Ultra Glass & Specular Reflection */}
            <div
              className="glass-terminal overflow-hidden rounded-2xl"
              style={{
                backgroundColor: "rgba(8, 11, 18, 0.95)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                boxShadow:
                  "0 20px 60px rgba(0, 0, 0, 0.8), inset 0 1px 1px rgba(255, 255, 255, 0.15)",
              }}
            >
              {/* Tab Bar Header with Inner Glass Sheen */}
              <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.03] px-4 py-3">
                {/* Traffic Light Dots */}
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[#ff5f56]/90 shadow-[0_0_8px_rgba(255,95,86,0.5)]" />
                  <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/90 shadow-[0_0_8px_rgba(255,189,46,0.5)]" />
                  <span className="h-3 w-3 rounded-full bg-[#27c93f]/90 shadow-[0_0_8px_rgba(39,201,63,0.5)]" />
                  <span className="ml-2 font-mono text-[11px] text-zinc-400">
                    liveflows-cli
                  </span>
                </div>

                {/* Tab Switchers */}
                <div className="flex items-center gap-1 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("quickstart")}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      activeTab === "quickstart"
                        ? "bg-white/15 text-white font-medium shadow-sm border border-white/10"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Quickstart
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("mcp")}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      activeTab === "mcp"
                        ? "bg-white/15 text-white font-medium shadow-sm border border-white/10"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    MCP Connect
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("clone")}
                    className={`rounded-lg px-2.5 py-1 transition-all ${
                      activeTab === "clone"
                        ? "bg-white/15 text-white font-medium shadow-sm border border-white/10"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Self Host
                  </button>
                </div>
              </div>

              {/* Code Preview Area */}
              <div className="p-5 font-mono text-xs leading-relaxed">
                <div className="flex items-start justify-between gap-4">
                  <div className="overflow-x-auto text-zinc-200">
                    {activeTab === "quickstart" && (
                      <div>
                        <p className="text-zinc-500 select-none">
                          # Initialize collaborative workspace in current
                          project
                        </p>
                        <p className="mt-1">
                          <span className="text-emerald-400 select-none">
                            ${" "}
                          </span>
                          <span className="text-white">
                            pnpm dlx create-liveflows-app@latest
                          </span>
                        </p>
                        <p className="mt-3 text-zinc-500 select-none">
                          ✔ Connected to Clerk Organizations
                        </p>
                        <p className="text-zinc-500 select-none">
                          ✔ Liveblocks realtime room initialized
                        </p>
                        <p className="text-zinc-500 select-none">
                          ✔ Postgres snapshot daemon ready (60s loop)
                        </p>
                      </div>
                    )}

                    {activeTab === "mcp" && (
                      <div>
                        <p className="text-zinc-500 select-none">
                          # Connect Claude or Cursor to LiveFlows via MCP
                          protocol
                        </p>
                        <p className="mt-1">
                          <span className="text-emerald-400 select-none">
                            ${" "}
                          </span>
                          <span className="text-white">
                            npx @liveflows/mcp connect --room sys-architecture
                          </span>
                        </p>
                        <p className="mt-3 text-zinc-500 select-none">
                          [MCP Server] Listening on stdio / HTTP
                        </p>
                        <p className="text-zinc-500 select-none">
                          [MCP Tools] 4 registered: get_canvas, upsert_node,
                          diff_scene, export_svg
                        </p>
                      </div>
                    )}

                    {activeTab === "clone" && (
                      <div>
                        <p className="text-zinc-500 select-none">
                          # Clone full stack Next.js 16 + Liveblocks + Prisma
                          repository
                        </p>
                        <p className="mt-1">
                          <span className="text-emerald-400 select-none">
                            ${" "}
                          </span>
                          <span className="text-white">
                            git clone https://github.com/dockified/liveflows.git
                          </span>
                        </p>
                        <p className="text-zinc-500 select-none">
                          $ cd liveflows && pnpm install && pnpm dev
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="shrink-0 flex items-center gap-1.5 rounded border border-white/10 bg-white/[0.05] px-2.5 py-1.5 text-[11px] font-medium text-zinc-300 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="h-3.5 w-3.5 text-emerald-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <svg
                          className="h-3.5 w-3.5 text-zinc-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
