import { dirname, join, parse as parsePath, resolve } from "path";

// --- Storage Service Interface ---
export interface ParsedPath {
  dir: string;
  base: string;
  name: string;
  ext: string;
}

export interface IStorageService {
  readFile(
    filePath: string,
    encoding?: BufferEncoding
  ): Promise<string | Buffer>;
  writeFile(
    filePath: string,
    data: string | Buffer,
    encoding?: BufferEncoding
  ): Promise<void>;
  ensureDir(dirPath: string): Promise<void>;
  listFiles(dirPath: string): Promise<string[]>; // Returns basenames of files
  exists(filePath: string): Promise<boolean>;
  unlink(filePath: string): Promise<void>;
  resolvePath(...paths: string[]): string; // Resolves to an "absolute" path within the storage context
  joinPath(...paths: string[]): string; // Joins path segments
  parsePath(filePath: string): ParsedPath;
  getPublicUrl(filePath: string): string; // Gets a publicly accessible URL
  isDir(path: string): Promise<boolean>;
}

// --- Local File System Implementation ---
export class LocalStorageService implements IStorageService {
  private publicRoot: string;
  private projectRoot: string;

  constructor(
    projectRoot: string = process.cwd(),
    publicDirName: string = "public"
  ) {
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
      return filePath.substring(this.publicRoot.length).replace(/\\/g, "/");
    }
    // If it's already a relative URL path
    if (filePath.startsWith("/")) {
      return filePath;
    }
    // Fallback, assuming it's relative to publicRoot
    return ("/" + filePath).replace(/\/\//g, "/");
  }

  async readFile(
    filePath: string,
    encoding?: BufferEncoding
  ): Promise<string | Buffer> {
    const absPath = this.getAbsolutePath(filePath);
    return readFileSync(absPath, { encoding });
  }

  async writeFile(
    filePath: string,
    data: string | Buffer,
    encoding?: BufferEncoding
  ): Promise<void> {
    console.log(`[LocalStorageService.writeFile] Received filePath: ${filePath}`);
    const absPath = this.getAbsolutePath(filePath);
    console.log(`[LocalStorageService.writeFile] Resolved absolute path for write: ${absPath}`);
    // Ensure directory exists before writing
    await this.ensureDir(dirname(filePath)); // Pass original relative filePath to ensureDir
    writeFileSync(absPath, data, { encoding });
  }

  async ensureDir(dirPath: string): Promise<void> {
    console.log(`[LocalStorageService.ensureDir] Received dirPath: ${dirPath}`);
    const absPath = this.getAbsolutePath(dirPath);
    console.log(`[LocalStorageService.ensureDir] Resolved absolute path for dir: ${absPath}`);
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
    return ("/" + relativePath.replace(/\\/g, "/")).replace(/\/\//g, "/");
  }
}

// Example of how it might be instantiated and used in an API route:
// const storageService: IStorageService = new LocalStorageService();
// await storageService.writeFile('path/to/file.txt', 'Hello');

// --- Storage Service Factory ---
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "fs";
// Ensure H3Event is available if serverSupabaseClient needs it and this factory is used in API routes
// import type { H3Event } from 'h3';
// For serverSupabaseClient, ensure it's correctly imported or available
// This might require '#supabase/server' or similar depending on @nuxtjs/supabase setup
// import { serverSupabaseClient } from '#supabase/server'; // Example import

import { SupabaseStorageService } from './supabaseStorageService'; // Import SupabaseStorageService
// Import both client types
import { serverSupabaseClient, serverSupabaseServiceRole } from '#supabase/server';

export async function getStorageService(
  event?: any /* H3Event */
): Promise<IStorageService> {
  const runtimeConfig = useRuntimeConfig(event); // Pass event if in H3 context and needed by useRuntimeConfig
  const storageProvider =
    runtimeConfig.public?.storageProvider ||
    process.env.STORAGE_PROVIDER ||
    "local";
  const supabaseBucketName =
    runtimeConfig.public?.supabaseStorageBucketName ||
    process.env.SUPABASE_STORAGE_BUCKET_NAME;

  console.log(`[StorageFactory] Provider: ${storageProvider}`);

  if (storageProvider === "supabase") {
    if (!event) {
       console.error("[StorageFactory] H3Event is required to get Supabase client for 'supabase' provider.");
       throw new Error("H3Event is required for Supabase storage service.");
    }
    if (!supabaseBucketName) {
       console.error("[StorageFactory] SUPABASE_STORAGE_BUCKET_NAME is not configured for 'supabase' provider.");
       throw new Error("Supabase storage bucket name is not configured.");
    }

    try {
      // For storage write operations, it's often better to use the service role client
      // to bypass RLS, assuming the backend has legitimate authority to write.
      // Ensure `event` is passed if serverSupabaseServiceRole requires it.
      const supabaseServiceRoleClient = await serverSupabaseServiceRole(event);
      if (!supabaseServiceRoleClient) {
        console.error("[StorageFactory] Failed to get Supabase Service Role client from server context. Falling back to user client or erroring.");
        // Fallback or throw, depending on requirements. For now, let's try the user client.
        // Alternatively, throw new Error("Failed to get Supabase Service Role client.");
        const supabaseUserClient = await serverSupabaseClient(event);
        if (!supabaseUserClient) {
            throw new Error("Failed to get Supabase client (user or service role) from server context.");
        }
        console.warn("[StorageFactory] Using user-scoped Supabase client for storage. RLS policies will apply.");
        return new SupabaseStorageService(supabaseUserClient as any, supabaseBucketName);
      }
      console.log("[StorageFactory] Using Supabase Service Role client for storage.");
      return new SupabaseStorageService(supabaseServiceRoleClient as any, supabaseBucketName);
    } catch (error: any) {
      console.error("[StorageFactory] Error initializing SupabaseStorageService:", error.message || error);
      throw new Error(`Failed to initialize Supabase storage service: ${error.message || 'Unknown error'}`);
    }

  } else {
    // LocalStorageService constructor takes (projectRoot, publicDirName)
    // process.cwd() and 'public' are its defaults.
    return new LocalStorageService();
  }
}
