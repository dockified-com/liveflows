import { testDb } from "./db";

/**
 * Factories for authorization tests.
 *
 * Every id is unique per process and per call, so concurrent test runs against
 * the same database cannot collide. Tests scope their assertions to the
 * workspace they created rather than truncating shared tables.
 */

let counter = 0;

function uid(prefix: string): string {
  counter += 1;
  return `${prefix}_${process.pid}_${counter}_${Date.now()}`;
}

export async function makeUser(
  overrides: { id?: string; email?: string } = {},
): Promise<{ id: string }> {
  const id = overrides.id ?? uid("user");
  return testDb.user.create({
    data: { id, email: overrides.email ?? `${id}@example.test` },
    select: { id: true },
  });
}

export async function makeWorkspace(
  overrides: { slug?: string } = {},
): Promise<{ id: string; slug: string }> {
  const slug = overrides.slug ?? uid("ws");
  return testDb.workspace.create({
    data: { clerkOrgId: uid("org"), name: slug, slug },
    select: { id: true, slug: true },
  });
}

export async function makeProject(args: {
  workspaceId: string;
  createdById: string;
  visibility?: string;
  name?: string;
}): Promise<{ id: string }> {
  return testDb.project.create({
    data: {
      name: args.name ?? uid("project"),
      workspaceId: args.workspaceId,
      createdById: args.createdById,
      visibility: args.visibility ?? "workspace",
    },
    select: { id: true },
  });
}

export async function makeProjectMember(args: {
  projectId: string;
  userId: string;
  role: string;
}): Promise<void> {
  await testDb.projectMember.create({ data: args });
}

export async function makeFolder(args: {
  projectId: string;
  parentId?: string | null;
  name?: string;
}): Promise<{ id: string }> {
  const name = args.name ?? uid("folder");
  const parentId = args.parentId ?? null;
  return testDb.folder.create({
    data: {
      projectId: args.projectId,
      parentId,
      name,
      normalizedName: name.toLowerCase(),
      // directoryKey denormalises the parent scope so a single query proves
      // name uniqueness. Format: "<projectId>:<parentId|ROOT>".
      directoryKey: `${args.projectId}:${parentId ?? "ROOT"}`,
    },
    select: { id: true },
  });
}

export async function makeFile(args: {
  projectId: string;
  createdById: string;
  folderId?: string | null;
  name?: string;
  type?: string;
}): Promise<{ id: string }> {
  const name = args.name ?? uid("file");
  const folderId = args.folderId ?? null;
  return testDb.file.create({
    data: {
      projectId: args.projectId,
      folderId,
      name,
      normalizedName: name.toLowerCase(),
      directoryKey: `${args.projectId}:${folderId ?? "ROOT"}`,
      type: args.type ?? "canvas",
      createdById: args.createdById,
    },
    select: { id: true },
  });
}
