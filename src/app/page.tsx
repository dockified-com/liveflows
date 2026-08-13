import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function Home() {
  const { isAuthenticated, orgSlug } = await auth();

  if (isAuthenticated) {
    if (orgSlug) {
      redirect(`/w/${orgSlug}`);
    } else {
      redirect("/session-tasks/choose-organization");
    }
  }

  return (
    <div className="min-h-screen bg-[#0e1117] text-[#f0f6fc] selection:bg-[#30363d]">
      <main className="relative">
        <header className="border-b border-[#21262d] bg-[#0e1117]/95">
          <nav
            className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8"
            aria-label="Global"
          >
            <div className="flex lg:flex-1">
              <span className="font-mono text-sm font-semibold tracking-[0.2em] text-[#f0f6fc] uppercase">
                LiveFlows
              </span>
            </div>
            <div className="flex flex-1 justify-end gap-x-6 items-center">
              <Link
                href="/sign-in"
                className="font-mono text-xs font-semibold text-[#f0f6fc] hover:text-[#ff9e00] transition-colors"
              >
                Log in
              </Link>
              <Link
                href="/sign-up"
                className="rounded border border-[#ff9e00] bg-[#ff9e00]/10 px-4 py-2 font-mono text-xs font-semibold text-[#ff9e00] hover:bg-[#ff9e00] hover:text-[#0e1117] transition-colors"
              >
                Sign up
              </Link>
            </div>
          </nav>
        </header>

        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.82fr_1.18fr] lg:px-8 lg:py-20">
          <div className="flex flex-col justify-center">
            <p className="font-mono text-xs font-semibold tracking-[0.24em] text-[#ff9e00] uppercase">
              Realtime architecture workspace
            </p>
            <h1 className="mt-5 text-4xl font-semibold text-[#f0f6fc] sm:text-6xl text-balance">
              Collaborative system design without canvas drift.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#8b949e]">
              Draw architecture diagrams together on an Excalidraw canvas backed
              by Liveblocks, scoped to Clerk workspaces, and mirrored to
              Postgres for fast project lists.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/sign-up"
                className="rounded bg-[#ff9e00] px-5 py-3 font-mono text-xs font-semibold text-[#0e1117] hover:bg-[#ffb547] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9e00] transition-colors"
              >
                START WORKSPACE
              </Link>
              <Link
                href="/sign-in"
                className="font-mono text-xs font-semibold text-[#f0f6fc] group"
              >
                OPEN EXISTING ORG{" "}
                <span
                  aria-hidden="true"
                  className="inline-block transition-transform group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            </div>
            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3 font-mono text-[11px]">
              <div className="border border-[#21262d] bg-[#161b22] p-3">
                <dt className="text-[#484f58]">WRITE PATH</dt>
                <dd className="mt-1 text-[#10b981]">LIVEBLOCKS</dd>
              </div>
              <div className="border border-[#21262d] bg-[#161b22] p-3">
                <dt className="text-[#484f58]">READ PATH</dt>
                <dd className="mt-1 text-[#f0f6fc]">POSTGRES</dd>
              </div>
              <div className="border border-[#21262d] bg-[#161b22] p-3">
                <dt className="text-[#484f58]">AUTH</dt>
                <dd className="mt-1 text-[#f0f6fc]">CLERK ORGS</dd>
              </div>
            </dl>
          </div>

          <section
            aria-label="LiveFlows canvas preview"
            className="border border-[#21262d] bg-[#161b22]"
          >
            <div className="flex items-center justify-between border-b border-[#21262d] px-4 py-3 font-mono text-[11px] text-[#8b949e]">
              <span>project: payments-platform</span>
              <span className="text-[#10b981]">3 collaborators live</span>
            </div>
            <div className="grid min-h-[470px] grid-cols-[150px_1fr]">
              <aside className="border-r border-[#21262d] bg-[#0e1117] p-4 font-mono text-[11px]">
                <p className="text-[#484f58]">FILES</p>
                <div className="mt-4 space-y-2">
                  <div className="border border-[#30363d] bg-[#161b22] px-3 py-2 text-[#f0f6fc]">
                    System Map
                  </div>
                  <div className="px-3 py-2 text-[#8b949e]">Auth Notes</div>
                  <div className="px-3 py-2 text-[#8b949e]">API Split</div>
                </div>
              </aside>
              <div className="relative overflow-hidden bg-[#f7f8fa]">
                <div className="absolute inset-0 bg-[linear-gradient(#d9dee7_1px,transparent_1px),linear-gradient(90deg,#d9dee7_1px,transparent_1px)] bg-[size:32px_32px]" />
                <div className="absolute left-[8%] top-[13%] rounded border border-[#9aa4b2] bg-white px-4 py-3 shadow-sm">
                  <p className="font-mono text-[10px] text-[#657080]">CLIENT</p>
                  <p className="mt-1 text-sm font-semibold text-[#0e1117]">
                    Web App
                  </p>
                </div>
                <div className="absolute left-[38%] top-[20%] rounded border-2 border-[#ff9e00] bg-white px-5 py-4 shadow-sm">
                  <p className="font-mono text-[10px] text-[#9a6700]">
                    EDGE ROUTE
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0e1117]">
                    API Gateway
                  </p>
                </div>
                <div className="absolute right-[8%] top-[12%] rounded border border-[#10b981] bg-white px-4 py-3 shadow-sm">
                  <p className="font-mono text-[10px] text-[#047857]">
                    REALTIME
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0e1117]">
                    Liveblocks Room
                  </p>
                </div>
                <div className="absolute bottom-[18%] left-[31%] rounded border border-[#9aa4b2] bg-white px-4 py-3 shadow-sm">
                  <p className="font-mono text-[10px] text-[#657080]">
                    READ MODEL
                  </p>
                  <p className="mt-1 text-sm font-semibold text-[#0e1117]">
                    Postgres Mirror
                  </p>
                </div>
                <svg
                  className="absolute inset-0 h-full w-full"
                  aria-hidden="true"
                  fill="none"
                  viewBox="0 0 640 470"
                >
                  <path
                    d="M136 104 C190 108 210 126 246 138"
                    stroke="#657080"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                  />
                  <path
                    d="M388 142 C440 108 472 96 515 94"
                    stroke="#10b981"
                    strokeWidth="2"
                  />
                  <path
                    d="M320 184 C310 248 300 290 286 336"
                    stroke="#ff9e00"
                    strokeWidth="2"
                  />
                </svg>
                <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between border border-[#d0d7de] bg-white/90 px-3 py-2 font-mono text-[10px] text-[#657080]">
                  <span>canvas mirror fresh: 42s ago</span>
                  <span>storage: 1.8 MB / 10 MB</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="border-t border-[#21262d] bg-[#0e1117] px-6 py-14 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-mono text-xs font-semibold tracking-[0.24em] text-[#8b949e] uppercase">
              Workspace guarantees
            </h2>
            <div className="mt-6 grid gap-px overflow-hidden border border-[#21262d] bg-[#21262d] md:grid-cols-3">
              {[
                [
                  "Realtime sync",
                  "Element-level updates keep teammates aligned without turning Postgres into the canvas writer.",
                ],
                [
                  "Workspace isolation",
                  "Room permissions resolve from Clerk organization membership instead of URL input.",
                ],
                [
                  "Readable mirrors",
                  "Project lists, search, and outage fallback read from the Postgres canvas snapshot.",
                ],
              ].map(([title, body]) => (
                <div key={title} className="bg-[#161b22] p-5">
                  <h3 className="text-sm font-semibold text-[#f0f6fc]">
                    {title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-[#8b949e]">
                    {body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
