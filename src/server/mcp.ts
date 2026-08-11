import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { db } from "./db";
import { liveblocks } from "./liveblocks";

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

      if (!file.liveblocksRoomId) {
        return {
          content: [
            { type: "text", text: "File does not have an active canvas room." },
          ],
          isError: true,
        };
      }

      // We need to mutate the Liveblocks storage.
      // Since Excalidraw uses a LiveMap for elements, we will update the elements.
      // Wait, let's look at how elements are represented in Liveblocks.
      // LiveFlows MVP 1a uses `LiveMap` for `elements` in `CanvasRoom`.

      const elementsMap: Record<string, any> = {};
      for (const el of elements) {
        if (el.id) {
          elementsMap[el.id] = el;
        }
      }

      if (Object.keys(elementsMap).length > 0) {
        try {
          const res = await fetch(
            `https://api.liveblocks.io/v2/rooms/${file.liveblocksRoomId}/storage`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${process.env.LIVEBLOCKS_SECRET_KEY}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                elements: {
                  update: elementsMap,
                },
              }),
            },
          );

          if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
          }
        } catch (e: any) {
          return {
            content: [
              {
                type: "text",
                text: `Failed to update Liveblocks storage: ${e.message}`,
              },
            ],
            isError: true,
          };
        }
      }

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
