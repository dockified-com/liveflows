import * as runtime from "@prisma/client/runtime/client";
import * as $Class from "./internal/class";
import * as Prisma from "./internal/prismaNamespace";
export * as $Enums from './enums';
export * from "./enums";
/**
 * ## Prisma Client
 *
 * Type-safe database client for TypeScript
 * @example
 * ```
 * const prisma = new PrismaClient({
 *   adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 * })
 * // Fetch zero or more Users
 * const users = await prisma.user.findMany()
 * ```
 *
 * Read more in our [docs](https://pris.ly/d/client).
 */
export declare const PrismaClient: $Class.PrismaClientConstructor;
export type PrismaClient<LogOpts extends Prisma.LogLevel = never, OmitOpts extends Prisma.PrismaClientOptions["omit"] = Prisma.PrismaClientOptions["omit"], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> = $Class.PrismaClient<LogOpts, OmitOpts, ExtArgs>;
export { Prisma };
/**
 * Model User
 *
 */
export type User = Prisma.UserModel;
/**
 * Model Workspace
 *
 */
export type Workspace = Prisma.WorkspaceModel;
/**
 * Model WorkspaceMember
 *
 */
export type WorkspaceMember = Prisma.WorkspaceMemberModel;
/**
 * Model Project
 *
 */
export type Project = Prisma.ProjectModel;
/**
 * Model Folder
 *
 */
export type Folder = Prisma.FolderModel;
/**
 * Model File
 *
 */
export type File = Prisma.FileModel;
/**
 * Model CanvasSnapshot
 *
 */
export type CanvasSnapshot = Prisma.CanvasSnapshotModel;
/**
 * Model DocumentSnapshot
 *
 */
export type DocumentSnapshot = Prisma.DocumentSnapshotModel;
/**
 * Model ProcessedWebhook
 *
 */
export type ProcessedWebhook = Prisma.ProcessedWebhookModel;
/**
 * Model PersonalAccessToken
 *
 */
export type PersonalAccessToken = Prisma.PersonalAccessTokenModel;
/**
 * Model ProjectMember
 *
 */
export type ProjectMember = Prisma.ProjectMemberModel;
//# sourceMappingURL=client.d.ts.map