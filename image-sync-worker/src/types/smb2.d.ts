declare module '@marsaud/smb2' {
  import { Readable } from 'node:stream';

  interface SMB2Options {
    share: string;
    domain: string;
    username: string;
    password: string;
    port?: number;
    autoCloseTimeout?: number;
    debug?: boolean;
  }

  interface SmbFileEntry {
    Filename: string;
    EndofFile: Buffer;
    LastWriteTime: Buffer;
    FileAttributes: number;
  }

  interface SMB2Client {
    exists(path: string, callback: (err: Error | null, exists?: boolean) => void): void;
    readdir(path: string, callback: (err: Error | null, files: string[] | SmbFileEntry[]) => void): void;
    createReadStream(path: string): Readable;
    close(callback: () => void): void;
  }

  interface SMB2Constructor {
    new (options: SMB2Options): SMB2Client;
    (options: SMB2Options): SMB2Client;
  }

  const SMB2: SMB2Constructor;
  export default SMB2;
}
