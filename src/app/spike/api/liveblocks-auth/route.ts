import { Liveblocks } from "@liveblocks/node";

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

/**
 * SPIKE ONLY — no authentication. Anyone who can reach localhost gets write
 * access to the spike room. Deleted before MVP 1a.
 */
export async function POST() {
  const userId = `spike-${Math.random().toString(36).slice(2, 8)}`;
  const session = liveblocks.prepareSession(userId, {
    userInfo: { name: userId, avatar: "" },
  });
  // Liveblocks wildcard patterns use "prefix:*" syntax, not glob.
  // For the spike, grant access to all rooms.
  session.allow("*", session.FULL_ACCESS);
  const { status, body } = await session.authorize();
  return new Response(body, { status });
}
