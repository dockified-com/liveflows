export default function WorkspaceLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8" aria-busy="true">
      <div className="h-8 w-32 animate-pulse rounded bg-gray-200 mb-6" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["s1", "s2", "s3", "s4", "s5", "s6"].map((id) => (
          <div
            key={id}
            className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-50"
          />
        ))}
      </div>
    </div>
  );
}
