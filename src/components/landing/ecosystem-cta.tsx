import Link from "next/link";

export function EcosystemCta() {
  return (
    <section className="relative overflow-hidden py-24 lg:py-32 bg-transparent border-t border-white/[0.08]">
      {/* Background Glow */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="h-[300px] w-[600px] rounded-full bg-white/[0.04] blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-6 text-center lg:px-8">
        <div
          className="inline-flex items-center rounded-full p-[1px] mb-6"
          style={{
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.1) 35%, rgba(255,255,255,0.04) 65%, rgba(255,255,255,0.5) 100%)",
            boxShadow:
              "0 0 20px rgba(255,255,255,0.08), 0 0 40px rgba(255,255,255,0.04)",
          }}
        >
          <span className="rounded-full bg-[#09090b] px-4 py-1 font-mono text-xs font-medium tracking-wide text-zinc-300">
            Open Infrastructure for Systems Architects
          </span>
        </div>

        <h2 className="text-4xl font-semibold tracking-tight text-white sm:text-6xl max-w-3xl mx-auto leading-tight text-balance">
          Build architectures without canvas drift.
        </h2>

        <p className="mt-6 max-w-xl mx-auto text-base text-zinc-400 font-sans leading-relaxed">
          Create an organization workspace, invite your engineering team, and
          start diagramming complex distributed systems in seconds.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center justify-center rounded-lg border border-white/20 bg-white px-8 py-3.5 font-mono text-xs font-semibold text-black transition-all hover:bg-zinc-200 hover:shadow-[0_0_35px_rgba(255,255,255,0.25)]"
          >
            START FREE WORKSPACE
            <span
              aria-hidden="true"
              className="ml-2 inline-block transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>

          <a
            href="https://github.com/dockified/liveflows"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] px-6 py-3.5 font-mono text-xs font-medium text-zinc-300 backdrop-blur transition-all hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
          >
            <svg
              className="mr-2 h-4 w-4 text-white"
              viewBox="0 0 16 16"
              fill="currentColor"
            >
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
            </svg>
            STAR ON GITHUB
          </a>
        </div>
      </div>
    </section>
  );
}
