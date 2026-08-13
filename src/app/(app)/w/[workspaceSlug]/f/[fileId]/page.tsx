import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { EditorPaneRouter } from "@/features/project-workspace/editor-pane-router";
import { getFileWithSnapshot } from "@/server/dal";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ workspaceSlug: string; fileId: string }>;
}) {
  const { workspaceSlug, fileId } = await params;
  const file = await getFileWithSnapshot(workspaceSlug, fileId);

  return (
    <div className="flex h-full w-full flex-col bg-[var(--surface)] font-sans">
      <header className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2 text-xs text-[var(--ink-secondary)] select-none">
        <div className="flex items-center gap-2">
          <span className="opacity-80">
            {file.type === "canvas" ? "🎨" : "📄"}
          </span>
          <h1 className="font-semibold text-[var(--ink)]">{file.name}</h1>
        </div>
        <a
          className="text-[var(--accent)] hover:underline"
          href={`/w/${workspaceSlug}`}
        >
          &larr; Back to workspace
        </a>
      </header>
      <div className="relative min-h-0 flex-1 w-full">
        <EditorPaneRouter
          fileId={file.id}
          fileType={file.type}
          liveblocksRoomId={file.liveblocksRoomId}
        />
      </div>
    </div>
  );
}
