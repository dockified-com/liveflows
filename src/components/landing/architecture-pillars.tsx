export function ArchitecturePillars() {
  const pillars = [
    {
      label: "DATA INTEGRITY",
      title: "Split Write & Read Engine",
      badge: "Zero Postgres Bottlenecks",
      description:
        "Liveblocks Storage is the sole write path for canvas elements. Postgres is the read path, refreshed at most once every 60s by the storageUpdated webhook. 60fps drag storms never lock database rows.",
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-white"
        >
          <rect x="6" y="8" width="12" height="10" rx="2" />
          <rect x="22" y="8" width="12" height="10" rx="2" />
          <rect x="14" y="24" width="12" height="10" rx="2" />
          <path d="M12 18V21C12 22 13 23 14 23H18M28 18V21C28 22 27 23 26 23H22" />
        </svg>
      ),
    },
    {
      label: "CONCURRENCY",
      title: "Deterministic CRDT Sync",
      badge: "elementSync.ts Pure Engine",
      description:
        "Pure reconciliation: arrays in, arrays out. Merges elements by version, breaks concurrent ties by versionNonce, and eliminates echo broadcast storms without external store overhead.",
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-white"
        >
          <circle cx="20" cy="20" r="14" strokeDasharray="3 3" />
          <circle cx="20" cy="10" r="3" fill="currentColor" />
          <circle cx="29" cy="25" r="3" fill="currentColor" />
          <circle cx="11" cy="25" r="3" fill="currentColor" />
          <path d="M20 13V20L27 23M20 20L13 23" />
        </svg>
      ),
    },
    {
      label: "SECURITY",
      title: "Clerk Org DAL Boundary",
      badge: "Zero URL Spoofing",
      description:
        "Authorization lives strictly in the Data Access Layer (DAL), never in proxies or client URLs. Non-members receive NotFoundError without leaking resource existence.",
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-white"
        >
          <path d="M20 6L32 11V19C32 26 26.5 32 20 34C13.5 32 8 26 8 19V11L20 6Z" />
          <path d="M16 20L19 23L25 17" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      label: "AI AGENT INTERFACE",
      title: "Model Context Protocol (MCP)",
      badge: "Agent Ready",
      description:
        "External AI coding agents (Claude, Cursor, Codex) connect via MCP tools to read architecture topology, perform system analysis, and generate diagrams programmatically.",
      icon: (
        <svg
          width="40"
          height="40"
          viewBox="0 0 40 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-white"
        >
          <rect x="8" y="10" width="24" height="20" rx="3" />
          <circle cx="15" cy="18" r="2" fill="currentColor" />
          <circle cx="25" cy="18" r="2" fill="currentColor" />
          <path d="M14 24H26M20 6V10" strokeLinecap="round" />
        </svg>
      ),
    },
  ];

  return (
    <section
      id="engine"
      className="relative scroll-mt-24 py-20 lg:py-28 bg-[#050505]/40 backdrop-blur-md"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <div
            className="inline-flex items-center rounded-full p-[1px] mb-4"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 35%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.4) 100%)",
            }}
          >
            <span className="rounded-full bg-[#0c0c0e] px-3 py-1 font-mono text-[11px] font-medium tracking-wider uppercase text-zinc-300">
              Core Architectural Pillars
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Engineered for realtime integrity
          </h2>
          <p className="mt-4 max-w-2xl text-base text-zinc-400 font-sans">
            Every architectural decision is built around deterministic
            concurrency, strict security boundaries, and high-velocity
            collaboration.
          </p>
        </div>

        {/* 4-Card Grid with DeepSeek Blue Glass */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="glass-card group relative flex flex-col justify-between overflow-hidden rounded-2xl p-8 transition-all"
              style={{
                backgroundColor: "rgba(8, 11, 18, 0.8)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                boxShadow: "0 10px 30px rgba(0, 0, 0, 0.5)",
              }}
            >
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[#679efe]/30 bg-[#679efe]/10 text-[#679efe] shadow-[0_0_20px_rgba(103,158,254,0.2)]">
                    {pillar.icon}
                  </div>
                  <span className="rounded-md border border-[#679efe]/25 bg-[#679efe]/[0.06] px-2.5 py-1 font-mono text-[10px] text-[#9abcfc]">
                    {pillar.badge}
                  </span>
                </div>

                <div className="mt-6">
                  <p className="font-mono text-[11px] font-semibold tracking-wider uppercase text-[#679efe]">
                    {pillar.label}
                  </p>
                  <h3 className="mt-1 font-mono text-xl font-semibold text-white group-hover:text-[#679efe] transition-colors">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400 font-sans">
                    {pillar.description}
                  </p>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-white/[0.06] flex items-center justify-between font-mono text-[11px] text-zinc-500">
                <span>Verified in production</span>
                <span className="text-[#679efe] group-hover:translate-x-0.5 transition-transform">
                  Spec locked →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
