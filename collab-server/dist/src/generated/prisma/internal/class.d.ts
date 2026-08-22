import * as runtime from "@prisma/client/runtime/client";
import type * as Prisma from "./prismaNamespace";
export type LogOptions<ClientOptions extends Prisma.PrismaClientOptions> = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never;
export interface PrismaClientConstructor {
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
    new <Options extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions, LogOpts extends LogOptions<Options> = LogOptions<Options>, OmitOpts extends Prisma.PrismaClientOptions['omit'] = Options extends {
        omit: infer U;
    } ? U : Prisma.PrismaClientOptions['omit'], ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs>(options: Prisma.PrismaClientConstructorArgs<Options>): PrismaClient<LogOpts, OmitOpts, ExtArgs>;
}
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
export interface PrismaClient<in LogOpts extends Prisma.LogLevel = never, in out OmitOpts extends Prisma.PrismaClientOptions['omit'] = Prisma.PrismaClientOptions['omit'], in out ExtArgs extends runtime.Types.Extensions.InternalArgs = runtime.Types.Extensions.DefaultArgs> {
    [K: symbol]: {
        types: Prisma.TypeMap<ExtArgs>['other'];
    };
    $on<V extends LogOpts>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;
    /**
     * Connect with the database
     */
    $connect(): runtime.Types.Utils.JsPromise<void>;
    /**
     * Disconnect from the database
     */
    $disconnect(): runtime.Types.Utils.JsPromise<void>;
    /**
       * Executes a prepared raw query and returns the number of affected rows.
       * @example
       * ```
       * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
       * ```
       *
       * Read more in our [docs](https://pris.ly/d/raw-queries).
       */
    $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;
    /**
     * Executes a raw query and returns the number of affected rows.
     * Susceptible to SQL injections, see documentation.
     * @example
     * ```
     * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;
    /**
     * Performs a prepared raw query and returns the `SELECT` data.
     * @example
     * ```
     * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;
    /**
     * Performs a raw query and returns the `SELECT` data.
     * Susceptible to SQL injections, see documentation.
     * @example
     * ```
     * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
     * ```
     *
     * Read more in our [docs](https://pris.ly/d/raw-queries).
     */
    $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;
    /**
     * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
     * @example
     * ```
     * const [george, bob, alice] = await prisma.$transaction([
     *   prisma.user.create({ data: { name: 'George' } }),
     *   prisma.user.create({ data: { name: 'Bob' } }),
     *   prisma.user.create({ data: { name: 'Alice' } }),
     * ])
     * ```
     *
     * Read more in our [docs](https://www.prisma.io/docs/orm/prisma-client/queries/transactions).
     */
    $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>;
    $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => runtime.Types.Utils.JsPromise<R>, options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
    }): runtime.Types.Utils.JsPromise<R>;
    $extends: runtime.Types.Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<OmitOpts>, ExtArgs, runtime.Types.Utils.Call<Prisma.TypeMapCb<OmitOpts>, {
        extArgs: ExtArgs;
    }>>;
    /**
 * `prisma.user`: Exposes CRUD operations for the **User** model.
  * Example usage:
  * ```ts
  * // Fetch zero or more Users
  * const users = await prisma.user.findMany()
  * ```
  */
    get user(): Prisma.UserDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.workspace`: Exposes CRUD operations for the **Workspace** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Workspaces
      * const workspaces = await prisma.workspace.findMany()
      * ```
      */
    get workspace(): Prisma.WorkspaceDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.workspaceMember`: Exposes CRUD operations for the **WorkspaceMember** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more WorkspaceMembers
      * const workspaceMembers = await prisma.workspaceMember.findMany()
      * ```
      */
    get workspaceMember(): Prisma.WorkspaceMemberDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.project`: Exposes CRUD operations for the **Project** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Projects
      * const projects = await prisma.project.findMany()
      * ```
      */
    get project(): Prisma.ProjectDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.folder`: Exposes CRUD operations for the **Folder** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Folders
      * const folders = await prisma.folder.findMany()
      * ```
      */
    get folder(): Prisma.FolderDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.file`: Exposes CRUD operations for the **File** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more Files
      * const files = await prisma.file.findMany()
      * ```
      */
    get file(): Prisma.FileDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.canvasSnapshot`: Exposes CRUD operations for the **CanvasSnapshot** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more CanvasSnapshots
      * const canvasSnapshots = await prisma.canvasSnapshot.findMany()
      * ```
      */
    get canvasSnapshot(): Prisma.CanvasSnapshotDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.documentSnapshot`: Exposes CRUD operations for the **DocumentSnapshot** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more DocumentSnapshots
      * const documentSnapshots = await prisma.documentSnapshot.findMany()
      * ```
      */
    get documentSnapshot(): Prisma.DocumentSnapshotDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.processedWebhook`: Exposes CRUD operations for the **ProcessedWebhook** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more ProcessedWebhooks
      * const processedWebhooks = await prisma.processedWebhook.findMany()
      * ```
      */
    get processedWebhook(): Prisma.ProcessedWebhookDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.personalAccessToken`: Exposes CRUD operations for the **PersonalAccessToken** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more PersonalAccessTokens
      * const personalAccessTokens = await prisma.personalAccessToken.findMany()
      * ```
      */
    get personalAccessToken(): Prisma.PersonalAccessTokenDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
    /**
     * `prisma.projectMember`: Exposes CRUD operations for the **ProjectMember** model.
      * Example usage:
      * ```ts
      * // Fetch zero or more ProjectMembers
      * const projectMembers = await prisma.projectMember.findMany()
      * ```
      */
    get projectMember(): Prisma.ProjectMemberDelegate<ExtArgs, {
        omit: OmitOpts;
    }>;
}
export declare function getPrismaClientClass(): PrismaClientConstructor;
//# sourceMappingURL=class.d.ts.map