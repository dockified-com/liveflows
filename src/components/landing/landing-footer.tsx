import Link from "next/link";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/[0.08] bg-[#030304]/80 backdrop-blur-xl py-12 text-zinc-400">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand & Status */}
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold tracking-wider uppercase text-white">
                LiveFlows
              </span>
              <span className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                v1.0
              </span>
            </div>
            <p className="font-mono text-xs text-zinc-500">
              Open source collaborative diagramming · MIT License
            </p>
          </div>

          {/* Operational Status Pill */}
          <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3 py-1 font-mono text-xs text-zinc-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>All systems operational</span>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center gap-6 font-mono text-xs">
            <Link
              href="/sign-in"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              Register
            </Link>
            <a
              href="https://github.com/dockified/liveflows"
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 transition-colors hover:text-white"
            >
              GitHub
            </a>
          </div>
        </div>

        <div className="mt-8 border-t border-white/[0.04] pt-6 text-center font-mono text-[11px] text-zinc-600">
          Built with Next.js 16, React 19, Liveblocks, Excalidraw & Tailwind v4.
        </div>
      </div>
    </footer>
  );
}
