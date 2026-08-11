import Link from "next/link";
import { getProject, listProjectContents } from "@/server/dal";
import { createFileAction, createFolderAction } from "./actions";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const project = await getProject(workspaceSlug, projectId);
  const { files, folders } = await listProjectContents(workspaceSlug, projectId);

  // For simplicity, just rendering a flat list of root level items here for now,
  // or all items. A full tree renderer can be built later.
  // The spec requires a simple UI to list project files/folders.
  
  const rootFiles = files.filter((f) => f.folderId === null);
  const rootFolders = folders.filter((f) => f.parentId === null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">{project.name}</h1>
          <Link
            href={`/w/${workspaceSlug}`}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Back to projects
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section>
          <h2 className="text-xl font-medium mb-4">Contents</h2>
          {rootFolders.length === 0 && rootFiles.length === 0 ? (
            <p className="text-gray-500">This project is empty.</p>
          ) : (
            <ul className="space-y-2">
              {rootFolders.map((folder) => (
                <li key={folder.id} className="flex items-center gap-2 p-2 border rounded">
                  <span className="text-yellow-600">📁</span>
                  <span>{folder.name}</span>
                </li>
              ))}
              {rootFiles.map((file) => (
                <li key={file.id} className="flex items-center gap-2 p-2 border rounded hover:border-blue-300">
                  <span className="text-blue-600">
                    {file.type === "canvas" ? "🎨" : "📄"}
                  </span>
                  <Link href={`/w/${workspaceSlug}/f/${file.id}`} className="flex-1 hover:underline">
                    {file.name}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-6">
          <div className="p-4 border rounded bg-gray-50">
            <h3 className="font-medium mb-2">Create File</h3>
            <form
              action={createFileAction.bind(null, workspaceSlug, projectId, null)}
              className="flex flex-col gap-3"
            >
              <input
                name="name"
                type="text"
                required
                placeholder="File name"
                className="rounded border px-3 py-2"
              />
              <select name="type" className="rounded border px-3 py-2">
                <option value="canvas">Canvas</option>
                <option value="document">Document</option>
              </select>
              <button
                type="submit"
                className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
              >
                Create File
              </button>
            </form>
          </div>

          <div className="p-4 border rounded bg-gray-50">
            <h3 className="font-medium mb-2">Create Folder</h3>
            <form
              action={createFolderAction.bind(null, workspaceSlug, projectId, null)}
              className="flex flex-col gap-3"
            >
              <input
                name="name"
                type="text"
                required
                placeholder="Folder name"
                className="rounded border px-3 py-2"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700"
              >
                Create Folder
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}
