export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-6xl p-7" aria-busy="true">
      <div className="mb-6 space-y-2.5">
        <div className="h-8 w-36 animate-pulse rounded-lg bg-[var(--line)]" />
        <div className="h-4 w-44 animate-pulse rounded bg-[var(--line)]" />
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => (
          <div
            key={id}
            className="rounded-xl border border-[var(--line)] bg-[var(--card)] p-[18px]"
          >
            <div className="flex items-start gap-3">
              <div className="h-[38px] w-[38px] shrink-0 animate-pulse rounded-[9px] bg-[var(--bg-2)]" />
              <div className="flex-1 space-y-2 pt-1">
                <div className="h-4 w-3/5 animate-pulse rounded bg-[var(--bg-2)]" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-[var(--bg-2)]" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
