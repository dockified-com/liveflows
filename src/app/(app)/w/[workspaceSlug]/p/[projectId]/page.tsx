import { getProjectWorkspace } from "@/server/dal";
import { ProjectWorkspaceView } from "./project-workspace-view";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string; projectId: string }>;
}) {
  const { workspaceSlug, projectId } = await params;
  const metadata = await getProjectWorkspace(workspaceSlug, projectId);

  return (
    <ProjectWorkspaceView
      workspaceSlug={workspaceSlug}
      metadata={metadata}
    />
  );
}
