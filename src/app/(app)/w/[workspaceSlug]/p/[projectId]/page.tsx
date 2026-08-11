import Link from "next/link";
import { getProject, listProjectContents } from "@/server/dal";
import { CreateFileForm, CreateFolderForm } from "./create-forms";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const project = await getProject(workspaceSlug, projectId);
  const { files, folders } = await listProjectContents(
    workspaceSlug,
    projectId,
  );

  const rootFiles = files.filter((f) => f.folderId === null);
  const rootFolders = folders.filter((f) => f.parentId === null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-8 font-sans">
      <header className="flex items-center justify-between border-b border-[#21262d] pb-4">
        <div>
          <span className="font-mono text-xs text-[#8b949e] uppercase tracking-widest">
            PROJECT_MANIFEST
          </span>
          <h1 className="font-mono text-xl font-semibold text-[#f0f6fc]">
            {project.name}
          </h1>
          <Link
            href={`/w/${workspaceSlug}`}
            className="font-mono text-xs text-[#ff9e00] hover:underline"
          >
            &larr; BACK TO WORKSPACE
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="border border-[#21262d] bg-[#161b22] p-6 rounded">
          <h2 className="font-mono text-sm font-semibold text-[#f0f6fc] uppercase tracking-wider mb-4 border-b border-[#21262d] pb-2">
            // CONTENTS ({rootFolders.length + rootFiles.length})
          </h2>
          {rootFolders.length === 0 && rootFiles.length === 0 ? (
            <p className="font-mono text-xs text-[#8b949e]">
              NO FILES OR FOLDERS CREATED YET.
            </p>
          ) : (
            <ul className="space-y-2 font-mono text-xs">
              {rootFolders.map((folder) => (
                <li
                  key={folder.id}
                  className="flex items-center gap-2 p-2.5 border border-[#21262d] bg-[#0e1117] rounded text-[#f0f6fc]"
                >
                  <span className="text-[#ff9e00]">📁</span>
                  <span>{folder.name}</span>
                </li>
              ))}
              {rootFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 p-2.5 border border-[#21262d] bg-[#0e1117] rounded hover:border-[#ff9e00] transition-colors"
                >
                  <span className="text-[#10b981]">
                    {file.type === "canvas" ? "🎨" : "📄"}
                  </span>
                  <Link
                    href={`/w/${workspaceSlug}/f/${file.id}`}
                    className="flex-1 text-[#f0f6fc] hover:text-[#ff9e00] transition-colors"
                  >
                    {file.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          <div className="p-5 border border-[#21262d] bg-[#161b22] rounded">
            <h3 className="font-mono text-xs font-semibold text-[#f0f6fc] uppercase tracking-wider mb-3">
              CREATE FILE
            </h3>
            <CreateFileForm
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              folderId={null}
            />
          </div>

          <div className="p-5 border border-[#21262d] bg-[#161b22] rounded">
            <h3 className="font-mono text-xs font-semibold text-[#f0f6fc] uppercase tracking-wider mb-3">
              CREATE FOLDER
            </h3>
            <CreateFolderForm
              workspaceSlug={workspaceSlug}
              projectId={projectId}
              parentId={null}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
