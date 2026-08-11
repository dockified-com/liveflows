import { NextRequest } from "next/server";
import { verifyPersonalAccessToken } from "@/server/dal/pats";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
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
  
  // We need to stream the response as SSE
  // but `@modelcontextprotocol/sdk` handles it if we pass the `ServerResponse` to it.
  // Next.js App Router GET handlers need to return a Response object.
  // SSEServerTransport in `@modelcontextprotocol/sdk` is designed for Express/Connect.
  // So we have to adapt it or manually create a ReadableStream.
  
  const stream = new ReadableStream({
    start(controller) {
      const adaptedRes = {
        writeHead(status: number, headers: Record<string, string>) {
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

      // @ts-ignore
      const t = new SSEServerTransport(`/api/mcp/message?sessionId=${sessionId}`, adaptedRes);
      
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
      "Connection": "keep-alive",
    },
  });
}
