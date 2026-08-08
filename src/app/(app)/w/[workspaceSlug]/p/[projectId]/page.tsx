import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { CanvasRoom } from "@/features/canvas";
import { getProjectWithSnapshot } from "@/server/dal";

// The Liveblocks client needs a browser environment, and the snapshot is read
// per-request, so this page must not be statically rendered.
export const dynamic = "force-dynamic";

/**
 * A project's canvas.
 *
 * `getProjectWithSnapshot` enforces the tenancy boundary — a project belonging
 * to another workspace raises notFound() rather than a permission error, so
 * existence is never leaked.
 *
 * `snapshotElements` comes from the Postgres mirror and is passed as
 * `fallbackElements`, which is what lets the board render read-only when
 * Liveblocks is unreachable instead of showing an empty canvas.
 */
export default async function Page({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const project = await getProjectWithSnapshot(workspaceSlug, projectId);

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="font-medium text-sm">{project.name}</h1>
        <a
          className="text-muted-foreground text-sm underline hover:text-foreground"
          href={`/w/${workspaceSlug}`}
        >
          Back to projects
        </a>
      </header>
      <div className="min-h-0 flex-1">
        <CanvasRoom
          fallbackElements={project.snapshotElements as ExcalidrawElement[]}
          roomId={project.liveblocksRoomId}
        />
      </div>
    </div>
  );
}
