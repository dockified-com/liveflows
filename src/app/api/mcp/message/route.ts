import type { NextRequest } from "next/server";
import { verifyPersonalAccessToken } from "@/server/dal/pats";
import { activeTransports } from "@/server/mcp";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.substring(7);
  const user = await verifyPersonalAccessToken(token);

  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return new Response("Missing sessionId", { status: 400 });
  }

  const transport = activeTransports.get(sessionId);
  if (!transport) {
    return new Response("Session not found or expired", { status: 404 });
  }

  try {
    // Next.js App Router req.json() reads the body
    const body = await req.json();

    // SSEServerTransport expects us to push messages to it via handlePostMessage
    // Wait, let's adapt standard HTTP Request to what SSEServerTransport expects
    // The MCP sdk exposes a method to handle post messages

    // In @modelcontextprotocol/sdk 1.30.0, SSEServerTransport handles messages via:
    // await transport.handlePostMessage(req, res) or we can manually emit.

    // According to the official implementation, you pass req and res to handlePostMessage
    // But since req and res in Next.js are not standard Node.js req/res, we might need a workaround.
    // However, looking at the code for @modelcontextprotocol/sdk/server/sse.js,
    // handlePostMessage reads chunks from req.
    // Instead, we can just pass the parsed JSON body directly if it has a way,
    // or simulate an Express req.

    const simulatedReq = {
      body,
      on: (event: string, callback: (data: any) => void) => {
        if (event === "data") callback(Buffer.from(JSON.stringify(body)));
        if (event === "end") callback(undefined);
      },
    };

    const simulatedRes = {
      writeHead: () => {},
      write: () => {},
      end: () => {},
    };

    // @ts-expect-error
    await transport.handlePostMessage(simulatedReq, simulatedRes);

    return new Response("Accepted", { status: 202 });
  } catch (e: any) {
    console.error("MCP message error", e);
    return new Response(e.message, { status: 500 });
  }
}
