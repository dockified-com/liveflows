export interface AuthContext {
    userId: string;
    readOnly: boolean;
}
/**
 * Verifies the Clerk session token and resolves workspace authorization.
 * Throws on any failure — Hocuspocus will reject the connection.
 */
export declare function onAuthenticate({ token, documentName, }: {
    token: string;
    documentName: string;
}): Promise<AuthContext>;
//# sourceMappingURL=authenticate.d.ts.map