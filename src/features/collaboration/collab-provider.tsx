"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { HocuspocusProvider } from "@hocuspocus/provider";
import type React from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import * as Y from "yjs";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "failed";

export interface CollabContextValue {
  provider: HocuspocusProvider | null;
  doc: Y.Doc | null;
  status: ConnectionStatus;
  others: Array<{
    clientId: number;
    user?: {
      name?: string;
      avatarUrl?: string;
      color?: string;
    };
  }>;
}

const CollabContext = createContext<CollabContextValue>({
  provider: null,
  doc: null,
  status: "connecting",
  others: [],
});

/** Deterministic color generator from user ID (AC-12) */
function colorForUserId(userId: string): string {
  const colors = [
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ef4444", // red
    "#8b5cf6", // violet
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#84cc16", // lime
  ];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export interface CollabRoomProviderProps {
  roomId: string;
  children: React.ReactNode;
}

export function CollabRoomProvider({
  roomId,
  children,
}: CollabRoomProviderProps) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [others, setOthers] = useState<CollabContextValue["others"]>([]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: new Doc per roomId
  const doc = useMemo(() => new Y.Doc(), [roomId]);

  const [provider, setProvider] = useState<HocuspocusProvider | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const url =
      process.env.NEXT_PUBLIC_COLLAB_URL ||
      (window.location.protocol === "https:"
        ? `wss://${window.location.host}/collab`
        : "ws://localhost:1234");

    const p = new HocuspocusProvider({
      url,
      name: roomId,
      document: doc,
      token: async () => {
        const token = await getToken();
        return token ?? "";
      },
      onStatus: ({ status: s }) => {
        if (s === "connected") setStatus("connected");
        else if (s === "connecting") setStatus("connecting");
        else if (s === "disconnected") setStatus("disconnected");
        else setStatus("connecting");
      },
      onAwarenessUpdate: ({ states }) => {
        const otherStates = states
          .filter(
            (s: { clientId: number; user?: unknown }) =>
              s.clientId !== doc.clientID,
          )
          .map(
            (s: {
              clientId: number;
              user?: { name?: string; avatarUrl?: string; color?: string };
            }) => ({
              clientId: s.clientId,
              user: s.user,
            }),
          );
        setOthers(otherStates);
      },
    });

    setProvider(p);

    return () => {
      p.destroy();
      doc.destroy();
      setProvider(null);
    };
  }, [roomId, doc, getToken]);

  useEffect(() => {
    if (!provider || !userId) return;

    provider.setAwarenessField("user", {
      id: userId,
      name: user?.fullName || user?.firstName || "Anonymous",
      avatarUrl: user?.imageUrl || "",
      color: colorForUserId(userId),
    });
  }, [provider, userId, user]);

  const value = useMemo(
    () => ({ provider, doc, status, others }),
    [provider, doc, status, others],
  );

  return (
    <CollabContext.Provider value={value}>{children}</CollabContext.Provider>
  );
}

export function useCollab(): CollabContextValue {
  return useContext(CollabContext);
}
