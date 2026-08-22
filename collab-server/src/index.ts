/**
 * Hocuspocus WebSocket collaboration server.
 *
 * Runs as a Docker Compose service beside the Next.js app.
 * No public port — reachable only over the internal Compose network.
 * The reverse proxy (nginx/Caddy) handles TLS and the WebSocket upgrade,
 * routing /collab to this process.
 *
 * Environment variables required:
 *   CLERK_SECRET_KEY       — Clerk backend secret for token verification
 *   DATABASE_URL           — Supabase pooler (transaction mode, port 6543)
 *   COLLAB_PORT            — listen port, default 1234
 */
import { Server } from "@hocuspocus/server";
import { onAuthenticate } from "./authenticate.js";
import { onLoadDocument, onStoreDocument } from "./persistence.js";

const PORT = Number(process.env.COLLAB_PORT ?? 1234);

const server = Server.configure({
  port: PORT,
  quiet: false,

  async onAuthenticate(data) {
    return onAuthenticate(data);
  },

  async onLoadDocument(data) {
    return onLoadDocument(data);
  },

  async onStoreDocument(data) {
    return onStoreDocument(data);
  },
});

server.listen(PORT, () => {
  console.log(`[collab] Hocuspocus server listening on :${PORT}`);
});

// Graceful shutdown
for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, async () => {
    console.log(`[collab] ${signal} received, shutting down`);
    await server.destroy();
    process.exit(0);
  });
}
