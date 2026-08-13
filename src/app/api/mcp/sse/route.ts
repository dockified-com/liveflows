import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import type { NextRequest } from "next/server";
import { verifyPersonalAccessToken } from "@/server/dal/pats";
import { activeTransports, createServer } from "@/server/mcp";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7);
  const user = await verifyPersonalAccessToken(token);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      const adaptedRes = {
        writeHead(_status: number, _headers: Record<string, string>) {
          // Headers handled in Next.js Response creation
        },
        write(chunk: string) {
          controller.enqueue(new TextEncoder().encode(chunk));
        },
        end() {
          controller.close();
        },
        on(event: string, callback: () => void) {
          if (event === "close") {
            req.signal.addEventListener("abort", callback);
          }
        },
      };

      const t = new SSEServerTransport(
        `/api/mcp/message?sessionId=${sessionId}`,
        adaptedRes as unknown as import("http").ServerResponse,
      );

      const s = createServer(user.id, sessionId);
      s.connect(t).catch(console.error);

      activeTransports.set(sessionId, t);

      req.signal.addEventListener("abort", () => {
        activeTransports.delete(sessionId);
        t.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
