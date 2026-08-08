import { CreateProjectModal } from "@/components/create-project-modal";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { ProjectList } from "@/components/project-list";
import { listProjects } from "@/server/dal/projects";
import { requireWorkspace } from "@/server/dal/workspaces";
import { createProjectAction, deleteProjectAction } from "./actions";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const workspace = await requireWorkspace(workspaceSlug);
  const projects = await listProjects(workspace.slug);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <ProjectList projects={projects} workspaceSlug={workspace.slug} />
      <CreateProjectModal
        createAction={createProjectAction.bind(null, workspace.slug)}
      />
      <DeleteProjectDialog
        deleteAction={deleteProjectAction.bind(null, workspace.slug)}
      />
    </div>
  );
}
