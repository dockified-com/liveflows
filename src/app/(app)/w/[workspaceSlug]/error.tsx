"use client";

import { useEffect } from "react";
import { InlineError } from "@/components/ui/inline-error";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Failed to load workspace projects:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-6xl p-7">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--ink)]">Projects</h1>
      </div>
      <InlineError
        title="Couldn’t load projects"
        message="Something went wrong while loading this workspace’s projects. Your navigation and other workspaces are unaffected."
        onRetry={reset}
      />
    </div>
  );
}
