import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { CanvasRoom } from "@/features/canvas";
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
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b px-4 py-2">
        <h1 className="font-medium text-sm">{file.name}</h1>
        <a
          className="text-muted-foreground text-sm underline hover:text-foreground"
          href={`/w/${workspaceSlug}`}
        >
          Back to workspace
        </a>
      </header>
      <div className="min-h-0 flex-1">
        <CanvasRoom
          fallbackElements={file.snapshotElements as ExcalidrawElement[]}
          roomId={file.liveblocksRoomId}
        />
      </div>
    </div>
  );
}
