-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "folderId" TEXT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "liveblocksRoomId" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentSnapshot" (
    "fileId" TEXT NOT NULL,
    "content" JSONB NOT NULL DEFAULT '{}',
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentSnapshot_pkey" PRIMARY KEY ("fileId")
);

-- CreateIndex
CREATE INDEX "Folder_projectId_idx" ON "Folder"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "File_liveblocksRoomId_key" ON "File"("liveblocksRoomId");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "File_folderId_name_key" ON "File"("folderId", "name");

-- Add raw SQL unique index for project root files (spec AC-1, AC-4)
CREATE UNIQUE INDEX "File_projectId_name_root_key" ON "File"("projectId", "name") WHERE "folderId" IS NULL;

-- Backfill data: For each project, create a File of type canvas
INSERT INTO "File" ("id", "projectId", "folderId", "name", "type", "liveblocksRoomId", "createdById", "createdAt", "updatedAt")
SELECT 
  gen_random_uuid()::text,
  "id",
  NULL,
  "name",
  'canvas',
  "liveblocksRoomId",
  "createdById",
  "createdAt",
  "updatedAt"
FROM "Project"
WHERE "liveblocksRoomId" IS NOT NULL;

-- Add fileId column to CanvasSnapshot
ALTER TABLE "CanvasSnapshot" ADD COLUMN "fileId" TEXT;

-- Map fileId using the projectId relation
UPDATE "CanvasSnapshot" cs
SET "fileId" = f."id"
FROM "File" f
WHERE cs."projectId" = f."projectId" AND f."type" = 'canvas';

-- Ensure all mapped fileIds are not null, then alter the column
ALTER TABLE "CanvasSnapshot" ALTER COLUMN "fileId" SET NOT NULL;

-- Drop constraints that depend on projectId
ALTER TABLE "CanvasSnapshot" DROP CONSTRAINT "CanvasSnapshot_projectId_fkey";
ALTER TABLE "CanvasSnapshot" DROP CONSTRAINT "CanvasSnapshot_pkey";
ALTER TABLE "CanvasSnapshot" DROP COLUMN "projectId";

-- Set new primary key
ALTER TABLE "CanvasSnapshot" ADD CONSTRAINT "CanvasSnapshot_pkey" PRIMARY KEY ("fileId");

-- Drop old liveblocksRoomId from Project
DROP INDEX "Project_liveblocksRoomId_key";
ALTER TABLE "Project" DROP COLUMN "liveblocksRoomId";

-- AddForeignKeys
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "File" ADD CONSTRAINT "File_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CanvasSnapshot" ADD CONSTRAINT "CanvasSnapshot_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentSnapshot" ADD CONSTRAINT "DocumentSnapshot_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE;
