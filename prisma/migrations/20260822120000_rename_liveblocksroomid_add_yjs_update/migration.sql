-- Migration: rename liveblocksRoomId → roomId, add DocumentSnapshot.yjsUpdate
-- Part of the Liveblocks → Hocuspocus/Yjs migration (spec 0007)

-- Rename column: liveblocksRoomId → roomId on File
ALTER TABLE "File" RENAME COLUMN "liveblocksRoomId" TO "roomId";

-- Add yjsUpdate column to DocumentSnapshot (lossless Yjs binary, nullable)
ALTER TABLE "DocumentSnapshot" ADD COLUMN "yjsUpdate" BYTEA;
