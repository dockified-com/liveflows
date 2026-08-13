"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import type { ProjectListItem } from "@/server/dal/projects";
import { useUiStore } from "@/stores/ui";

function formatRelativeDate(date: Date, now: number = Date.now()): string {
  const diffMs = now - new Date(date).getTime();
  if (diffMs < 0) {
    return "Updated just now";
  }

  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Updated just now";
  if (minutes === 1) return "Updated 1m ago";
  if (minutes < 60) return `Updated ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours === 1) return "Updated 1h ago";
  if (hours < 24) return `Updated ${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "Updated 1d ago";
  if (days < 7) return `Updated ${days}d ago`;

  const d = new Date(date);
  return `Updated ${d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

function ProjectCard({
  project,
  workspaceSlug,
}: {
  project: ProjectListItem;
  workspaceSlug: string;
}) {
  return (
    <li>
      <Link
        href={`/w/${workspaceSlug}/p/${project.id}`}
        className="group block rounded-xl border border-[var(--line)] bg-[var(--card)] p-[18px] shadow-[0_1px_2px_rgba(15,23,42,0.04),0_1px_3px_rgba(15,23,42,0.06)] transition-[transform,box-shadow,border-color] duration-150 hover:scale-[1.02] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[9px] bg-[var(--accent-soft)] text-[var(--accent)]">
            <Icon size={17}>
              <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm10.5 0A2.25 2.25 0 0116.5 3.75h1.5A2.25 2.25 0 0120.25 6v1.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V6zM3.75 16.5A2.25 2.25 0 016 14.25h1.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.5zm10.5 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-1.5A2.25 2.25 0 0114.25 18v-1.5z" />
            </Icon>
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold text-[var(--ink)]">
              {project.name}
            </h2>
            <p className="mt-0.5 text-xs text-[var(--ink-faint)]">
              {formatRelativeDate(project.updatedAt)}
            </p>
          </div>
        </div>
      </Link>
    </li>
  );
}

function NewProjectCard({ onClick }: { onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-[120px] w-full flex-col items-center justify-center gap-2 rounded-xl border-[1.5px] border-dashed border-[var(--line)] bg-transparent p-[18px] text-[var(--ink-faint)] transition-colors hover:border-[var(--accent)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
      >
        <Icon size={22}>
          <path d="M12 4.5v15m7.5-7.5h-15" />
        </Icon>
        <span className="text-[13.5px] font-medium">New project</span>
      </button>
    </li>
  );
}

export function ProjectList({
  projects,
  workspaceSlug,
}: {
  projects: ProjectListItem[];
  workspaceSlug: string;
}) {
  const { openModal } = useUiStore();
  const openCreate = () => openModal({ kind: "create-project" });

  return (
    <section aria-labelledby="projects-heading">
      <div className="mb-6">
        <h1
          id="projects-heading"
          className="text-2xl font-bold text-[var(--ink)]"
        >
          Projects
        </h1>
        <p className="mt-1 text-sm text-[var(--ink-faint)]">
          {projects.length === 0
            ? "System diagrams and architectures for this workspace."
            : `${projects.length} ${projects.length === 1 ? "project" : "projects"}`}
        </p>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={
            <Icon size={28}>
              <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25a2.25 2.25 0 012.25 2.25v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm10.5 0A2.25 2.25 0 0116.5 3.75h1.5A2.25 2.25 0 0120.25 6v1.5a2.25 2.25 0 01-2.25 2.25h-1.5a2.25 2.25 0 01-2.25-2.25V6zM3.75 16.5A2.25 2.25 0 016 14.25h1.5a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25v-1.5zm10.5 0a2.25 2.25 0 012.25-2.25h1.5a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-1.5A2.25 2.25 0 0114.25 18v-1.5z" />
            </Icon>
          }
          title="No projects yet"
          description="Projects are shared canvases where your team designs system diagrams together."
          action={
            <Button variant="primary" size="md" onClick={openCreate}>
              + New project
            </Button>
          }
        />
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              workspaceSlug={workspaceSlug}
            />
          ))}
          <NewProjectCard onClick={openCreate} />
        </ul>
      )}
    </section>
  );
}
