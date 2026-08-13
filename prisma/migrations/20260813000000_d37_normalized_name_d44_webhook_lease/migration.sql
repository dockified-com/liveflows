-- D37: Add normalizedName + directoryKey to Folder and File for namespace uniqueness
-- D44: Add durable lease columns to ProcessedWebhook

-- ── Folder ───────────────────────────────────────────────────────────────────

-- 1. Add nullable columns first (safe on existing rows)
ALTER TABLE "Folder" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "Folder" ADD COLUMN "directoryKey"   TEXT;

-- 2. Backfill existing rows
--    directoryKey = "<projectId>:<parentId>" or "<projectId>:ROOT"
UPDATE "Folder"
SET
  "normalizedName" = lower("name"),
  "directoryKey"   = "projectId" || ':' || COALESCE("parentId", 'ROOT');

-- 3. Make NOT NULL now that all rows are filled
ALTER TABLE "Folder" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "Folder" ALTER COLUMN "directoryKey"   SET NOT NULL;

-- 4. Drop old plain unique index (was not explicit — no constraint to drop on schema)
--    Add new composite unique constraint
ALTER TABLE "Folder" ADD CONSTRAINT "Folder_directoryKey_normalizedName_key"
  UNIQUE ("directoryKey", "normalizedName");

-- ── File ─────────────────────────────────────────────────────────────────────

ALTER TABLE "File" ADD COLUMN "normalizedName" TEXT;
ALTER TABLE "File" ADD COLUMN "directoryKey"   TEXT;

UPDATE "File"
SET
  "normalizedName" = lower("name"),
  "directoryKey"   = "projectId" || ':' || COALESCE("folderId", 'ROOT');

ALTER TABLE "File" ALTER COLUMN "normalizedName" SET NOT NULL;
ALTER TABLE "File" ALTER COLUMN "directoryKey"   SET NOT NULL;

-- Drop old (folderId, name) unique constraint
ALTER TABLE "File" DROP CONSTRAINT IF EXISTS "File_folderId_name_key";

-- Add new composite unique constraint
ALTER TABLE "File" ADD CONSTRAINT "File_directoryKey_normalizedName_key"
  UNIQUE ("directoryKey", "normalizedName");

-- ── ProcessedWebhook (D44) ───────────────────────────────────────────────────

ALTER TABLE "ProcessedWebhook" ADD COLUMN "status"       TEXT      NOT NULL DEFAULT 'completed';
ALTER TABLE "ProcessedWebhook" ADD COLUMN "leaseUntil"   TIMESTAMP(3);
ALTER TABLE "ProcessedWebhook" ADD COLUMN "attemptCount" INTEGER   NOT NULL DEFAULT 1;
ALTER TABLE "ProcessedWebhook" ADD COLUMN "completedAt"  TIMESTAMP(3);

-- Index for lease-based processing queries
CREATE INDEX IF NOT EXISTS "ProcessedWebhook_status_leaseUntil_idx"
  ON "ProcessedWebhook" ("status", "leaseUntil");
