"use client";

import Link from "next/link";
import type { ProjectListItem } from "@/server/dal/projects";
import { useUiStore } from "@/stores/ui";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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
    <section aria-labelledby="projects-heading">
      <div className="flex items-center justify-between mb-6">
        <h1 id="projects-heading" className="text-2xl font-semibold">
          Projects
        </h1>
        <button
          type="button"
          onClick={() => openModal({ kind: "create-project" })}
          className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          New project
        </button>
      </div>

      {projects.length === 0 ? (
        <p className="text-gray-500">
          No projects yet. Create one to get started.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/w/${workspaceSlug}/p/${project.id}`}
                className="block rounded-lg border border-gray-200 p-4 hover:border-blue-300 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <h2 className="text-base font-medium truncate">
                  {project.name}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Updated {formatDate(project.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
