"use client";

import Link from "next/link";
import type { ProjectListItem } from "@/server/dal/projects";
import { useUiStore } from "@/stores/ui";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function formatDate(date: Date): string {
  const d = new Date(date);
  const month = MONTHS[d.getUTCMonth()];
  const day = d.getUTCDate();
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${month} ${day}, ${hours}:${minutes} UTC`;
}

export function ProjectList({
  projects,
  workspaceSlug,
}: {
  projects: ProjectListItem[];
  workspaceSlug: string;
}) {
  const { openModal } = useUiStore();

  return (
    <section aria-labelledby="projects-heading" className="space-y-6">
      {/* Telemetry Header Bar */}
      <div className="flex flex-col gap-4 border border-[#21262d] bg-[#161b22] p-4 font-mono text-xs text-[#8b949e] md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <span className="text-[#484f58] uppercase">TOTAL_PROJECTS:</span>{" "}
            <span className="font-semibold text-[#f0f6fc]">
              {projects.length}
            </span>
          </div>
          <div>
            <span className="text-[#484f58] uppercase">MIRROR_STATUS:</span>{" "}
            <span className="text-[#10b981]">SYNCED</span>
          </div>
          <div>
            <span className="text-[#484f58] uppercase">PERMISSIONS:</span>{" "}
            <span className="text-[#ff9e00]">MEMBER_READ_WRITE</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => openModal({ kind: "create-project" })}
          className="inline-flex items-center justify-center gap-2 rounded border border-[#ff9e00] bg-[#ff9e00]/10 px-4 py-2 font-mono text-xs font-semibold text-[#ff9e00] hover:bg-[#ff9e00] hover:text-[#0e1117] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9e00] transition-colors"
        >
          <span>+</span> NEW PROJECT
        </button>
      </div>

      <div className="flex items-center justify-between border-b border-[#21262d] pb-3">
        <h1
          id="projects-heading"
          className="font-mono text-sm font-semibold tracking-wider text-[#f0f6fc] uppercase"
        >
          // SYSTEM DIAGRAMS & ARCHITECTURES
        </h1>
      </div>

      {projects.length === 0 ? (
        <div className="border border-dashed border-[#30363d] bg-[#161b22]/50 p-12 text-center font-mono text-xs text-[#8b949e]">
          <p className="mb-4">NO ACTIVE DIAGRAM ROOMS IN THIS WORKSPACE.</p>
          <button
            type="button"
            onClick={() => openModal({ kind: "create-project" })}
            className="text-[#ff9e00] underline hover:text-[#ff9e00]/80"
          >
            CREATE FIRST PROJECT &rarr;
          </button>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project, idx) => (
            <li key={project.id}>
              <Link
                href={`/w/${workspaceSlug}/p/${project.id}`}
                className="group relative block rounded border border-[#21262d] bg-[#161b22] p-5 hover:border-[#ff9e00] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ff9e00]"
              >
                {/* Top Meta Line */}
                <div className="flex items-center justify-between font-mono text-[10px] text-[#484f58] mb-3">
                  <span>#SYS-{String(idx + 1).padStart(2, "0")}</span>
                  <span className="flex items-center gap-1.5 text-[#10b981]">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#10b981]"></span>
                    READY
                  </span>
                </div>

                {/* Project Title */}
                <h2 className="font-mono text-sm font-semibold text-[#f0f6fc] group-hover:text-[#ff9e00] transition-colors truncate">
                  {project.name}
                </h2>

                {/* Canvas Wireframe Placeholder Accent */}
                <div className="mt-4 h-24 w-full rounded border border-[#21262d] bg-[#0e1117] p-2 font-mono text-[10px] text-[#484f58] flex flex-col justify-between group-hover:border-[#30363d] transition-colors">
                  <div className="flex justify-between items-center text-[9px] text-[#30363d]">
                    <span>GRID 100x100</span>
                    <span>CANVAS_STORAGE</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 text-[#484f58]">
                    <svg
                      className="h-5 w-5 text-[#30363d] group-hover:text-[#ff9e00]/50 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.75 3.75v16.5h16.5M3.75 12h16.5M12 3.75v16.5"
                      />
                    </svg>
                    <span className="text-[10px]">
                      Interactive Excalidraw Room
                    </span>
                  </div>
                  <div className="text-right text-[9px] text-[#30363d]">
                    LIVEBLOCKS_ROOM
                  </div>
                </div>

                {/* Bottom Footer Details */}
                <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-[#8b949e]">
                  <span>UPDATED</span>
                  <span className="text-[#f0f6fc]">
                    {formatDate(project.updatedAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
