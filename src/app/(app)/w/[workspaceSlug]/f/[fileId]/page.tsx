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
    <div className="flex h-full w-full flex-col bg-[#0e1117]">
      <header className="flex items-center justify-between border-b border-[#21262d] bg-[#161b22] px-4 py-2 font-mono text-xs text-[#8b949e]">
        <div className="flex items-center gap-2">
          <span className="text-[#10b981]">🎨</span>
          <h1 className="font-semibold text-[#f0f6fc]">{file.name}</h1>
        </div>
        <a
          className="text-[#ff9e00] hover:underline"
          href={`/w/${workspaceSlug}`}
        >
          &larr; BACK TO WORKSPACE
        </a>
      </header>
      <div className="relative min-h-0 flex-1 w-full">
        <CanvasRoom
          fallbackElements={file.snapshotElements as ExcalidrawElement[]}
          roomId={file.liveblocksRoomId}
        />
      </div>
    </div>
  );
}
