import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  unlinkSync,
  statSync,
} from 'fs';
import { resolve, join, parse as parsePath, dirname } from 'path';

// --- Storage Service Interface ---
export interface ParsedPath {
  dir: string;
  base: string;
  name: string;
  ext: string;
}

export interface IStorageService {
  readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer>;
  writeFile(filePath: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void>;
  ensureDir(dirPath: string): Promise<void>;
  listFiles(dirPath: string): Promise<string[]>; // Returns basenames of files
  exists(filePath: string): Promise<boolean>;
  unlink(filePath: string): Promise<void>;
  resolvePath(...paths: string[]): string; // Resolves to an "absolute" path within the storage context
  joinPath(...paths: string[]): string;   // Joins path segments
  parsePath(filePath: string): ParsedPath;
  getPublicUrl(filePath: string): string; // Gets a publicly accessible URL
  isDir(path: string): Promise<boolean>;
}

// --- Local File System Implementation ---
export class LocalStorageService implements IStorageService {
  private publicRoot: string;
  private projectRoot: string;

  constructor(projectRoot: string = process.cwd(), publicDirName: string = 'public') {
    this.projectRoot = projectRoot;
    this.publicRoot = resolve(projectRoot, publicDirName);
  }

  private getAbsolutePath(filePath: string): string {
    // filePath is expected to be relative to the publicRoot if it's for public access,
    // or relative to projectRoot for other server-side operations.
    // For simplicity here, we'll assume paths passed are either absolute
    // or relative to projectRoot for internal operations, and publicRoot for public URLs.
    // This needs careful handling based on how paths are used.
    // Let's assume filePath for fs operations is relative to projectRoot.
    return resolve(this.projectRoot, filePath);
  }
  
  private getPublicPath(filePath: string): string {
    // Converts an absolute path within publicRoot to a URL path
    if (filePath.startsWith(this.publicRoot)) {
      return filePath.substring(this.publicRoot.length).replace(/\\/g, '/');
    }
    // If it's already a relative URL path
    if (filePath.startsWith('/')) {
        return filePath;
    }
    // Fallback, assuming it's relative to publicRoot
    return ('/' + filePath).replace(/\/\//g, '/');
  }


  async readFile(filePath: string, encoding?: BufferEncoding): Promise<string | Buffer> {
    const absPath = this.getAbsolutePath(filePath);
    return readFileSync(absPath, { encoding });
  }

  async writeFile(filePath: string, data: string | Buffer, encoding?: BufferEncoding): Promise<void> {
    const absPath = this.getAbsolutePath(filePath);
    // Ensure directory exists before writing
    await this.ensureDir(dirname(absPath));
    writeFileSync(absPath, data, { encoding });
  }

  async ensureDir(dirPath: string): Promise<void> {
    const absPath = this.getAbsolutePath(dirPath);
    if (!existsSync(absPath)) {
      mkdirSync(absPath, { recursive: true });
    }
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const absPath = this.getAbsolutePath(dirPath);
    if (!existsSync(absPath)) {
        return [];
    }
    return readdirSync(absPath);
  }

  async exists(filePath: string): Promise<boolean> {
    const absPath = this.getAbsolutePath(filePath);
    return existsSync(absPath);
  }

  async unlink(filePath: string): Promise<void> {
    const absPath = this.getAbsolutePath(filePath);
    if (existsSync(absPath)) {
      unlinkSync(absPath);
    }
  }
  
  async isDir(path: string): Promise<boolean> {
    const absPath = this.getAbsolutePath(path);
    if (!existsSync(absPath)) return false;
    return statSync(absPath).isDirectory();
  }

  resolvePath(...paths: string[]): string {
    // This should resolve paths within the context of the storage (e.g., project root)
    return resolve(this.projectRoot, ...paths);
  }

  joinPath(...paths: string[]): string {
    // This should join paths within the context of the storage
    // For local, it's similar to path.join, but needs to be careful about the root.
    // Let's assume it joins to be relative from projectRoot for internal use.
    return join(...paths);
  }

  parsePath(filePath: string): ParsedPath {
    // filePath here is expected to be a path within the storage context
    const absPath = this.getAbsolutePath(filePath);
    return parsePath(absPath);
  }

  getPublicUrl(filePath: string): string {
    // filePath is expected to be relative to the public directory root
    // e.g., "podcasts/podcastId/segments/001.mp3"
    let relativePath = filePath;
    if (filePath.startsWith(this.publicRoot)) {
        relativePath = filePath.substring(this.publicRoot.length);
    }
    return ('/' + relativePath.replace(/\\/g, '/')).replace(/\/\//g, '/');
  }
}

// Example of how it might be instantiated and used in an API route:
// const storageService: IStorageService = new LocalStorageService();
// await storageService.writeFile('path/to/file.txt', 'Hello');