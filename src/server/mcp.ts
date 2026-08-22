import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { db } from "./db";

// We keep a global map of active transports.
// Note: In a serverless environment, this requires sticky sessions or a single instance.
// For local dev/containerized deployment this is sufficient.
export const activeTransports = new Map<string, SSEServerTransport>();
export const activeServers = new Map<string, McpServer>();

export function createServer(userId: string, sessionId: string) {
  const server = new McpServer({
    name: "LiveFlows",
    version: "1.0.0",
  });

  server.tool(
    "list_files",
    "List canvases and documents in a workspace",
    {
      workspaceSlug: z.string().describe("The slug of the workspace"),
    },
    async ({ workspaceSlug }) => {
      const workspace = await db.workspace.findUnique({
        where: { slug: workspaceSlug },
        include: {
          members: { where: { userId } },
        },
      });

      if (!workspace || workspace.members.length === 0) {
        return {
          content: [
            { type: "text", text: "Workspace not found or access denied." },
          ],
          isError: true,
        };
      }

      const files = await db.file.findMany({
        where: { project: { workspaceId: workspace.id } },
        select: { id: true, name: true, type: true },
      });

      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }],
      };
    },
  );

  server.tool(
    "read_canvas",
    "Read the current state of a canvas",
    {
      fileId: z.string().describe("The ID of the canvas file"),
    },
    async ({ fileId }) => {
      const file = await db.file.findUnique({
        where: { id: fileId },
        include: {
          project: {
            include: {
              workspace: {
                include: { members: { where: { userId } } },
              },
            },
          },
        },
      });

      if (!file || file.project.workspace.members.length === 0) {
        return {
          content: [{ type: "text", text: "File not found or access denied." }],
          isError: true,
        };
      }

      if (file.type !== "canvas") {
        return {
          content: [{ type: "text", text: "File is not a canvas." }],
          isError: true,
        };
      }

      const snapshot = await db.canvasSnapshot.findUnique({
        where: { fileId },
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              snapshot
                ? { elements: snapshot.elements, appState: snapshot.appState }
                : { elements: [], appState: {} },
              null,
              2,
            ),
          },
        ],
      };
    },
  );

  server.tool(
    "draw_elements",
    "Add or update Excalidraw elements on a canvas",
    {
      fileId: z.string().describe("The ID of the canvas file"),
      elements: z
        .array(z.any())
        .describe("List of Excalidraw elements to add or update"),
    },
    async ({ fileId, elements }) => {
      const file = await db.file.findUnique({
        where: { id: fileId },
        include: {
          project: {
            include: {
              workspace: {
                include: { members: { where: { userId } } },
              },
            },
          },
        },
      });

      if (!file || file.project.workspace.members.length === 0) {
        return {
          content: [{ type: "text", text: "File not found or access denied." }],
          isError: true,
        };
      }

      if (!file.roomId) {
        return {
          content: [
            { type: "text", text: "File does not have an active canvas room." },
          ],
          isError: true,
        };
      }

      const snapshot = await db.canvasSnapshot.findUnique({
        where: { fileId },
      });

      const currentElements =
        (snapshot?.elements as Array<{
          id: string;
          version?: number;
          versionNonce?: number;
        }>) ?? [];
      // biome-ignore lint/suspicious/noExplicitAny: Excalidraw element loose shape
      const byId = new Map<string, any>(
        currentElements.map((el) => [el.id, el]),
      );

      for (const el of elements) {
        if (!el?.id) continue;
        const existing = byId.get(el.id);
        if (!existing) {
          byId.set(el.id, el);
        } else {
          const incomingVersion = el.version ?? 0;
          const existingVersion = existing.version ?? 0;
          const incomingNonce = el.versionNonce ?? 0;
          const existingNonce = existing.versionNonce ?? 0;

          if (
            incomingVersion > existingVersion ||
            (incomingVersion === existingVersion &&
              incomingNonce < existingNonce)
          ) {
            byId.set(el.id, el);
          }
        }
      }

      const mergedElements = Array.from(byId.values());
      const nonDeletedCount = mergedElements.filter(
        (el) => !el.isDeleted,
      ).length;

      await db.canvasSnapshot.upsert({
        where: { fileId },
        create: {
          fileId,
          elements: mergedElements,
          appState: snapshot?.appState ?? {},
          elementCount: nonDeletedCount,
        },
        update: {
          elements: mergedElements,
          elementCount: nonDeletedCount,
          syncedAt: new Date(),
        },
      });

      return {
        content: [
          { type: "text", text: "Successfully applied elements to canvas." },
        ],
      };
    },
  );

  activeServers.set(sessionId, server);
  return server;
}
