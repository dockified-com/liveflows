import { CanvasRoom } from "@/features/canvas";

// Force dynamic rendering — Liveblocks client needs browser environment
export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;
  return <CanvasRoom roomId={roomId} />;
}
