/*
  Warnings:

  - You are about to drop the column `appState` on the `CanvasSnapshot` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CanvasSnapshot" DROP COLUMN "appState",
ADD COLUMN     "viewBackgroundColor" TEXT NOT NULL DEFAULT '#ffffff';
