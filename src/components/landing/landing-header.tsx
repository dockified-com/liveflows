"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type ActiveMenu = "product" | "solutions" | "resources" | "agents" | null;

interface LandingHeaderProps {
  workspaceUrl?: string | null;
}

export function LandingHeader({ workspaceUrl }: LandingHeaderProps = {}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>(null);
  const [scrolled, setScrolled] = useState(false);
  const leaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseEnter = (menu: ActiveMenu) => {
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
    setActiveMenu(menu);
  };

  const handleMouseLeave = () => {
    leaveTimerRef.current = setTimeout(() => {
      setActiveMenu(null);
    }, 150);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setActiveMenu(null);
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 w-full px-4 pt-3 sm:px-6 sm:pt-4 transition-all duration-300"
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`glass-header mx-auto max-w-7xl transition-all duration-300 rounded-2xl ${
          scrolled ? "py-2.5 px-4 sm:px-6" : "py-3 px-4 sm:px-6"
        }`}
        style={{
          backgroundColor: "rgba(7, 9, 14, 0.85)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow:
            "0 8px 32px 0 rgba(0, 0, 0, 0.6), 0 0 20px rgba(45, 95, 158, 0.18)",
        }}
      >
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="group flex items-center gap-2.5 text-white transition-opacity hover:opacity-90"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 bg-white/5 shadow-[0_0_15px_rgba(103,158,254,0.3)] backdrop-blur-md transition-transform group-hover:scale-105">
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-white"
                >
                  <rect
                    x="3"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <rect
                    x="14"
                    y="3"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <rect
                    x="8.5"
                    y="14"
                    width="7"
                    height="7"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  />
                  <path
                    d="M6.5 10V12C6.5 12.8 7.2 13.5 8 13.5H9M17.5 10V12C17.5 12.8 16.8 13.5 16 13.5H15"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <span className="font-mono text-sm font-semibold tracking-wider uppercase text-white">
                LiveFlows
              </span>
            </Link>
          </div>

          {/* Desktop Navigation Triggers: Product ∨ | Solutions ∨ | Resources ∨ | Agents ∨ | DiagramGPT | Enterprise | Pricing */}
          <nav
            className="hidden md:flex items-center gap-1 text-xs font-medium text-zinc-300"
            aria-label="Main Navigation"
          >
            {/* 1. Product ∨ */}
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter("product")}
              onClick={() =>
                setActiveMenu(activeMenu === "product" ? null : "product")
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                activeMenu === "product"
                  ? "bg-[#679efe]/15 text-white border border-[#679efe]/30 shadow-[0_0_15px_rgba(103,158,254,0.2)]"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>Product</span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${
                  activeMenu === "product"
                    ? "rotate-180 text-[#679efe]"
                    : "text-zinc-400"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* 2. Solutions ∨ */}
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter("solutions")}
              onClick={() =>
                setActiveMenu(activeMenu === "solutions" ? null : "solutions")
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                activeMenu === "solutions"
                  ? "bg-[#679efe]/15 text-white border border-[#679efe]/30 shadow-[0_0_15px_rgba(103,158,254,0.2)]"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>Solutions</span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${
                  activeMenu === "solutions"
                    ? "rotate-180 text-[#679efe]"
                    : "text-zinc-400"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* 3. Resources ∨ */}
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter("resources")}
              onClick={() =>
                setActiveMenu(activeMenu === "resources" ? null : "resources")
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                activeMenu === "resources"
                  ? "bg-[#679efe]/15 text-white border border-[#679efe]/30 shadow-[0_0_15px_rgba(103,158,254,0.2)]"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>Resources</span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${
                  activeMenu === "resources"
                    ? "rotate-180 text-[#679efe]"
                    : "text-zinc-400"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* 4. Agents ∨ */}
            <button
              type="button"
              onMouseEnter={() => handleMouseEnter("agents")}
              onClick={() =>
                setActiveMenu(activeMenu === "agents" ? null : "agents")
              }
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-all ${
                activeMenu === "agents"
                  ? "bg-[#679efe]/15 text-white border border-[#679efe]/30 shadow-[0_0_15px_rgba(103,158,254,0.2)]"
                  : "hover:bg-white/10 hover:text-white"
              }`}
            >
              <span>Agents</span>
              <svg
                className={`h-3 w-3 transition-transform duration-200 ${
                  activeMenu === "agents"
                    ? "rotate-180 text-[#679efe]"
                    : "text-zinc-400"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* 5. DiagramGPT */}
            <a
              href="#engine"
              className="rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/10 hover:text-white flex items-center gap-1.5"
            >
              <span>DiagramGPT</span>
              <span className="rounded bg-[#679efe]/20 text-[#679efe] px-1 py-0.2 font-mono text-[9px] border border-[#679efe]/30">
                AI
              </span>
            </a>

            {/* 6. Enterprise */}
            <a
              href="#benchmarks"
              className="rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/10 hover:text-white"
            >
              Enterprise
            </a>

            {/* 7. Pricing */}
            <a
              href="#modes"
              className="rounded-lg px-2.5 py-1.5 transition-all hover:bg-white/10 hover:text-white"
            >
              Pricing
            </a>
          </nav>

          {/* Right Action CTAs: Login & Try Liveflow */}
          <div className="flex items-center gap-3">
            {workspaceUrl ? (
              <Link
                href={workspaceUrl}
                className="group relative inline-flex items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-1.5 font-mono text-xs font-semibold text-black transition-all hover:bg-[#e6eeff] hover:shadow-[0_0_25px_rgba(103,158,254,0.4)]"
              >
                Go to Workspace
                <span
                  aria-hidden="true"
                  className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5 text-[#679efe]"
                >
                  →
                </span>
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  className="text-xs font-medium text-zinc-300 transition-all hover:text-white px-2 py-1.5"
                >
                  Login
                </Link>
                <Link
                  href="/sign-up"
                  className="group relative inline-flex items-center justify-center rounded-xl border border-white/30 bg-white px-4 py-1.5 font-mono text-xs font-semibold text-black transition-all hover:bg-[#e6eeff] hover:shadow-[0_0_25px_rgba(103,158,254,0.4)]"
                >
                  Try Liveflow
                  <span
                    aria-hidden="true"
                    className="ml-1.5 inline-block transition-transform group-hover:translate-x-0.5 text-[#679efe]"
                  >
                    →
                  </span>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-400 hover:text-white md:hidden"
              aria-label="Toggle Navigation Menu"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* DeepSeek Blue Glass Mega-Menu Dropdowns                   */}
        {/* ======================================================== */}

        {/* 1. Product Mega-Menu Dropdown Panel */}
        {activeMenu === "product" && (
          <div
            onMouseEnter={() => handleMouseEnter("product")}
            className="glass-dropdown mt-4 hidden md:block overflow-hidden rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: "rgba(8, 11, 18, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(45,95,158,0.25)",
            }}
          >
            <div className="grid grid-cols-2 gap-4 p-5">
              <a
                href="#engine"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                      Multiplayer Canvas Engine
                    </h4>
                    <span className="rounded bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 font-mono text-[9px] text-emerald-400">
                      11ms sync
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Liveblocks CRDT storage absorbs 60fps drag events with
                    multi-cursor presence.
                  </p>
                </div>
              </a>

              <a
                href="#architecture"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <ellipse cx="12" cy="5" rx="9" ry="3" />
                    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                      Postgres Read Mirror
                    </h4>
                    <span className="rounded bg-white/10 px-1.5 py-0.2 font-mono text-[9px] text-zinc-300">
                      Prisma 7
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    CanvasSnapshot 60s background daemon guarantees zero-latency
                    project indexing.
                  </p>
                </div>
              </a>

              <a
                href="#engine"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                  >
                    <path d="M12 2v4m0 12v4M2 12h4m12 0h4m-3.5-6.5l-2.5 2.5m-8 8l-2.5 2.5m13 0l-2.5-2.5m-8-8l-2.5-2.5" />
                  </svg>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                      DiagramGPT Copilot
                    </h4>
                    <span className="rounded bg-indigo-950/60 border border-indigo-500/30 px-1.5 py-0.2 font-mono text-[9px] text-indigo-400">
                      AI Powered
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Generate microservices, databases, and network topologies
                    with natural language.
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* 2. Solutions Mega-Menu Dropdown Panel */}
        {activeMenu === "solutions" && (
          <div
            onMouseEnter={() => handleMouseEnter("solutions")}
            className="glass-dropdown mt-4 hidden md:block overflow-hidden rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: "rgba(8, 11, 18, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(45,95,158,0.25)",
            }}
          >
            <div className="grid grid-cols-2 gap-4 p-5">
              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  🏛️
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    For System Architects
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Map distributed system components, load balancers, and event
                    queues in high definition.
                  </p>
                </div>
              </a>

              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  👥
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    For Engineering Teams
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Collaborate synchronously during RFC reviews and technical
                    design brainstorming sessions.
                  </p>
                </div>
              </a>

              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  🤖
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    For AI Coding Agents
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Connect Claude, Cursor, and Codex via MCP to autonomously
                    draw and inspect diagrams.
                  </p>
                </div>
              </a>

              <a
                href="#benchmarks"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  🔒
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    Enterprise Isolation
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Clerk Org tenancy with Data Access Layer (DAL) security and
                    zero URL leaking.
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* 3. Resources Mega-Menu Dropdown Panel */}
        {activeMenu === "resources" && (
          <div
            onMouseEnter={() => handleMouseEnter("resources")}
            className="glass-dropdown mt-4 hidden md:block overflow-hidden rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: "rgba(8, 11, 18, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(45,95,158,0.25)",
            }}
          >
            <div className="grid grid-cols-2 gap-4 p-5">
              <a
                href="#benchmarks"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  📄
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    Technical Specifications
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Full product design documents, CRDT invariants, and
                    architecture RFCs.
                  </p>
                </div>
              </a>

              <a
                href="#engine"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  ⚡
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    Architecture Whitepaper
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Deep dive on dual-path Liveblocks write vs Postgres read
                    mirroring.
                  </p>
                </div>
              </a>

              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  🛠️
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    MCP Integration Guide
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Step-by-step setup for Claude Code, Cursor, and Codex
                    workspaces.
                  </p>
                </div>
              </a>

              <a
                href="https://github.com/dockified/liveflows"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex gap-3.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                  🐙
                </div>
                <div>
                  <h4 className="font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    GitHub Open Source
                  </h4>
                  <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
                    Explore the repository, report issues, and view community
                    contributions.
                  </p>
                </div>
              </a>
            </div>
          </div>
        )}

        {/* 4. Agents Mega-Menu Dropdown Panel */}
        {activeMenu === "agents" && (
          <div
            onMouseEnter={() => handleMouseEnter("agents")}
            className="glass-dropdown mt-4 hidden md:block overflow-hidden rounded-2xl transition-all duration-300 animate-in fade-in slide-in-from-top-2"
            style={{
              backgroundColor: "rgba(8, 11, 18, 0.95)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.14)",
              boxShadow:
                "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(45,95,158,0.25)",
            }}
          >
            <div className="grid grid-cols-3 gap-4 p-5">
              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex flex-col justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                    🤖
                  </div>
                  <h4 className="mt-3 font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    Model Context Protocol
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                    Connect Claude Code, Cursor, and Codex directly to your live
                    whiteboards.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[10px] text-[#679efe]">
                  MCP 1.0 Ready →
                </span>
              </a>

              <a
                href="#modes"
                onClick={() => setActiveMenu(null)}
                className="group flex flex-col justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                    ⚙️
                  </div>
                  <h4 className="mt-3 font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    Tool Schemas & SDK
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                    Structured JSON tools for node insertion, connection
                    routing, and scene diffing.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[10px] text-[#679efe]">
                  View JSON Protocol →
                </span>
              </a>

              <a
                href="#benchmarks"
                onClick={() => setActiveMenu(null)}
                className="group flex flex-col justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-all hover:border-[#679efe]/40 hover:bg-[#679efe]/[0.08]"
              >
                <div>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe]">
                    ⚡
                  </div>
                  <h4 className="mt-3 font-mono text-xs font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    CLI Quick Connect
                  </h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-zinc-400">
                    Run npx @liveflows/mcp connect to bridge local agents.
                  </p>
                </div>
                <span className="mt-4 font-mono text-[10px] text-[#679efe]">
                  Inspect CLI Spec →
                </span>
              </a>
            </div>
          </div>
        )}

        {/* Mobile Accordion Menu Drawer */}
        {mobileMenuOpen && (
          <div className="mt-3 border-t border-white/10 pt-3 md:hidden">
            <nav className="flex flex-col gap-2 font-mono text-xs text-zinc-300">
              <a
                href="#engine"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Product
              </a>
              <a
                href="#modes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Solutions
              </a>
              <a
                href="#architecture"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Resources
              </a>
              <a
                href="#modes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Agents
              </a>
              <a
                href="#engine"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                DiagramGPT
              </a>
              <a
                href="#benchmarks"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Enterprise
              </a>
              <a
                href="#modes"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-lg px-2 py-1.5 hover:bg-[#679efe]/15 hover:text-white"
              >
                Pricing
              </a>
            </nav>
            <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-2">
              <Link
                href="/sign-in"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-center rounded-lg hover:bg-white/10"
              >
                Login
              </Link>
              <Link
                href="/sign-up"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-center rounded-lg bg-white text-black font-semibold"
              >
                Try Liveflow →
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
