export function TechnicalBenchmarks() {
  const comparisons = [
    {
      dimension: "Authoritative Write Path",
      liveflows: "Liveblocks Storage (LiveMap CRDT)",
      naiveDb: "Postgres table rows (Row locks)",
      heavyYjs: "Binary Yjs byte-array over WebSocket",
    },
    {
      dimension: "Drag Storm Latency (60fps)",
      liveflows: "<15ms (100ms throttled diffs)",
      naiveDb: ">220ms (Database connection pool choke)",
      heavyYjs: "~40ms (Large binary payload per frame)",
    },
    {
      dimension: "Project List Read Speed",
      liveflows: "Sub-millisecond (Indexed Postgres Mirror)",
      naiveDb: "Fast (Indexed queries)",
      heavyYjs: "Slow (Must boot Yjs doc to get metadata)",
    },
    {
      dimension: "Multi-tenant Auth Security",
      liveflows: "Strict Clerk DAL Session (Zero URL leaks)",
      naiveDb: "Often URL-param or client token based",
      heavyYjs: "Custom socket auth middleware",
    },
    {
      dimension: "AI MCP Agent Protocol",
      liveflows: "Native structured JSON tools (Claude / Cursor)",
      naiveDb: "Complex raw SQL schema mappings",
      heavyYjs: "Binary decoding hurdle for LLMs",
    },
    {
      dimension: "Outage & Degraded Resilience",
      liveflows: "Instant read-only fallback to snapshot",
      naiveDb: "Complete system downtime",
      heavyYjs: "Socket drop loses un-persisted memory",
    },
  ];

  return (
    <section
      id="benchmarks"
      className="relative scroll-mt-24 py-20 lg:py-28 bg-[#050505]/50 backdrop-blur-lg border-t border-white/[0.08]"
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
              Technical Comparison
            </span>
          </div>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            Why the split-engine model wins
          </h2>
          <p className="mt-4 max-w-2xl text-base text-zinc-400 font-sans">
            Collaborative whiteboards fail when they treat Postgres as the
            realtime canvas writer. LiveFlows decouples write bursts from read
            indexes.
          </p>
        </div>

        {/* Comparison Table with DeepSeek Blue Glass */}
        <div
          className="glass-card mt-14 overflow-x-auto rounded-2xl"
          style={{
            backgroundColor: "rgba(8, 11, 18, 0.85)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow:
              "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(45, 95, 158, 0.15)",
          }}
        >
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-white/[0.1] bg-white/[0.03]">
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-zinc-400">
                  Engineering Criterion
                </th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-white bg-[#679efe]/10 border-x border-[#679efe]/20">
                  LiveFlows Split-Engine ⚡
                </th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-zinc-500">
                  Naive Postgres DB Sockets
                </th>
                <th className="py-4 px-6 font-semibold uppercase tracking-wider text-zinc-500">
                  Raw Yjs Binary Stack
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {comparisons.map((row) => (
                <tr
                  key={row.dimension}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="py-4 px-6 font-medium text-zinc-300">
                    {row.dimension}
                  </td>
                  <td className="py-4 px-6 font-medium text-[#679efe] bg-[#679efe]/[0.04] border-x border-[#679efe]/15">
                    {row.liveflows}
                  </td>
                  <td className="py-4 px-6 text-zinc-500">{row.naiveDb}</td>
                  <td className="py-4 px-6 text-zinc-500">{row.heavyYjs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
