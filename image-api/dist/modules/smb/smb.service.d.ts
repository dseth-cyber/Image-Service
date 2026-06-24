interface SmbEntry {
    name: string;
    isDirectory: boolean;
}
export declare function testConnection(params: {
    smbSharePath: string;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbDomain?: string;
}): Promise<{
    success: boolean;
    message: string;
}>;
export declare function listShares(params: {
    host: string;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbDomain?: string;
}): Promise<{
    shares: Array<{
        name: string;
        description: string;
    }>;
}>;
export declare function browseDirectory(params: {
    smbSharePath: string;
    smbUsername: string;
    smbPasswordEncrypted: string;
    smbDomain?: string;
    path?: string;
}): Promise<{
    entries: SmbEntry[];
    currentPath: string;
}>;
export {};
//# sourceMappingURL=smb.service.d.ts.map