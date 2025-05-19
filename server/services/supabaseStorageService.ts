import { IStorageService, ParsedPath } from './storageService'; // Assuming IStorageService is in the same dir or adjust path
import { SupabaseClient } from '@supabase/supabase-js';
// Note: Actual path parsing might need a Deno-compatible library or custom logic
// For Deno, path module is available: import * as path from "https://deno.land/std/path/mod.ts";

// Helper to ensure paths are treated as relative to a root and don't escape
function sanitizePath(base: string, userPath: string): string {
  // This is a simplified sanitizer. In a real scenario, more robust path
  // sanitization and joining would be needed, especially for Deno.
  // Deno's path.join and path.resolve would be used here.
  // For now, we'll assume userPath is a relative path intended to be under base.
  const combined = `${base}/${userPath}`.replace(/\/\//g, '/');
  if (combined.startsWith(`${base}/`)) {
    return combined;
  }
  throw new Error(`Invalid path: ${userPath} attempts to escape base ${base}`);
}


export class SupabaseStorageService implements IStorageService {
  private supabase: SupabaseClient;
  private bucketName: string;

  constructor(supabase: SupabaseClient, bucketName: string) {
    this.supabase = supabase;
    this.bucketName = bucketName;
    console.log(`SupabaseStorageService initialized for bucket: ${this.bucketName}`);
  }

  private getStoragePath(filePath: string): string {
    // filePath is expected to be like "podcasts/podcastId/segments/file.mp3"
    // Remove leading slash if present, as Supabase paths don't start with /
    return filePath.startsWith('/') ? filePath.substring(1) : filePath;
  }

  async readFile(filePath: string, encoding: BufferEncoding = 'utf-8'): Promise<string | Buffer> {
    const storagePath = this.getStoragePath(filePath);
    console.log(`SupabaseStorage: Reading file ${storagePath} from bucket ${this.bucketName}`);
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .download(storagePath);

    if (error) {
      console.error(`SupabaseStorage: Error reading file ${storagePath}`, error);
      throw new Error(`Failed to read file from Supabase Storage: ${error.message}`);
    }
    if (!data) {
        throw new Error(`No data returned for file ${storagePath} from Supabase Storage.`);
    }

    if (encoding === 'utf-8') {
      return await data.text();
    }
    // For buffer, convert Blob to ArrayBuffer then to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async writeFile(filePath: string, data: string | Buffer, options?: { encoding?: BufferEncoding; contentType?: string }): Promise<void> {
    const storagePath = this.getStoragePath(filePath);
    console.log(`SupabaseStorage: Writing file ${storagePath} to bucket ${this.bucketName} with options:`, JSON.stringify(options, null, 2));
    
    let fileBody: Blob | ArrayBuffer | Buffer | string = data;
    if (Buffer.isBuffer(data)) {
        const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        if (buffer instanceof SharedArrayBuffer) {
          const regularBuffer = new ArrayBuffer(buffer.byteLength);
          new Uint8Array(regularBuffer).set(new Uint8Array(buffer));
          fileBody = regularBuffer;
        } else {
          fileBody = buffer;
        }
    }

    // Determine contentType
    let determinedContentType = options?.contentType;
    if (!determinedContentType) {
      // Fallback to existing logic if not provided, now with more image types
      if (filePath.endsWith('.json')) {
        determinedContentType = 'application/json'; // Changed from text/plain to application/json
      } else if (filePath.endsWith('.mp3')) {
        determinedContentType = 'audio/mpeg';
      } else if (filePath.endsWith('.png')) {
        determinedContentType = 'image/png';
      } else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) {
        determinedContentType = 'image/jpeg';
      } else if (filePath.endsWith('.webp')) {
        determinedContentType = 'image/webp';
      } else {
        determinedContentType = 'application/octet-stream';
      }
    }
    console.log(`SupabaseStorage: Using contentType: ${determinedContentType} for file ${storagePath}`);

    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(storagePath, fileBody, { 
          upsert: true, // Overwrite if exists
          contentType: determinedContentType
        });

    if (error) {
      console.error(`SupabaseStorage: Error writing file ${storagePath}`, error);
      throw new Error(`Failed to write file to Supabase Storage: ${error.message}`);
    }
  }

  async ensureDir(dirPath: string): Promise<void> {
    // Supabase Storage doesn't have "directories" in the same way as a file system.
    // Objects are stored with their full paths. Creating an empty object (like a .empty file)
    // can simulate a directory if needed for some listings, but generally not required for writes.
    console.log(`SupabaseStorage: ensureDir for ${dirPath} - typically a no-op or handled by writing an object within the path.`);
    // Example: To "create" a folder, you might upload a placeholder file.
    // const placeholderPath = this.getStoragePath(this.joinPath(dirPath, '.placeholder'));
    // await this.writeFile(placeholderPath, ''); // This would be relative to project root
    return Promise.resolve();
  }

  async listFiles(dirPath: string): Promise<string[]> {
    const storagePath = this.getStoragePath(dirPath);
    console.log(`SupabaseStorage: Listing files in ${storagePath} from bucket ${this.bucketName}`);
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .list(storagePath, {
        // limit: 100, // Optional: add limits and offsets for pagination
        // offset: 0,
      });

    if (error) {
      console.error(`SupabaseStorage: Error listing files in ${storagePath}`, error);
      throw new Error(`Failed to list files from Supabase Storage: ${error.message}`);
    }
    return data ? data.map(file => file.name) : [];
  }

  async exists(filePath: string): Promise<boolean> {
    const storagePath = this.getStoragePath(filePath);
    console.log(`SupabaseStorage: Checking existence of ${storagePath} in bucket ${this.bucketName}`);
    // A common way to check existence is to try to get metadata or list with a specific prefix.
    // Supabase list with the exact path might work if it's treated as a prefix.
    // Or, try downloading a small part, or getting metadata.
    // For simplicity, let's try listing with the path as prefix and see if we get a result.
    // This is not the most efficient way. A HEAD request or getPublicUrl might be better if available.
    const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list(storagePath.substring(0, storagePath.lastIndexOf('/')), { search: storagePath.substring(storagePath.lastIndexOf('/') + 1) });

    if (error) {
        // If error is "Not found", it doesn't exist. Other errors are actual problems.
        if (error.message.toLowerCase().includes('not found')) return false;
        console.error(`SupabaseStorage: Error checking existence for ${storagePath}`, error);
        // Don't throw, just return false or re-throw if it's a critical error
        return false; 
    }
    return data !== null && data.length > 0 && data.some(f => f.name === storagePath.substring(storagePath.lastIndexOf('/') + 1));
  }

  async unlink(filePath: string): Promise<void> {
    const storagePath = this.getStoragePath(filePath);
    console.log(`SupabaseStorage: Deleting file ${storagePath} from bucket ${this.bucketName}`);
    const { error } = await this.supabase.storage
      .from(this.bucketName)
      .remove([storagePath]);

    if (error) {
      console.error(`SupabaseStorage: Error deleting file ${storagePath}`, error);
      throw new Error(`Failed to delete file from Supabase Storage: ${error.message}`);
    }
  }

  async isDir(path: string): Promise<boolean> {
    // In S3-like object storage, directories are just prefixes.
    // A common way to check if something "is" a directory is to list objects with that prefix.
    // If listing with prefix + "/" returns items, it's like a directory.
    // Or, if an object exists with that exact name ending in "/", some systems treat it as a dir.
    // For simplicity, we can say a path is a dir if it doesn't have an extension and listing it (as prefix) returns items.
    // This is a heuristic and might need refinement.
    const storagePath = this.getStoragePath(path);
    console.log(`SupabaseStorage: Checking if ${storagePath} is a directory.`);
    if (storagePath.endsWith('/')) { // Explicit directory marker
        const { data, error } = await this.supabase.storage.from(this.bucketName).list(storagePath);
        return !error && data != null; // If no error and data is not null, it's a "directory"
    }
    // Check if listing with this as a prefix returns anything
    const { data, error } = await this.supabase.storage.from(this.bucketName).list(storagePath + '/', {limit: 1});
    return !error && data != null && data.length > 0;
  }

  // Path methods need to be adapted for Supabase context (object keys)
  // These are simplified and assume paths are relative to bucket root.
  resolvePath(...paths: string[]): string {
    // Deno: return path.resolve(...paths);
    // For Supabase, paths are typically just keys, so joining might be more relevant.
    // This method might be less meaningful for S3-like storage unless mapping to a local structure.
    // Let's assume it's for constructing the object key.
    return this.joinPath(...paths);
  }

  joinPath(...paths: string[]): string {
    // Deno: return path.join(...paths);
    return paths.join('/').replace(/\/\//g, '/').replace(/^\//, ''); // Normalize and remove leading slash
  }

  parsePath(filePath: string): ParsedPath {
    // Deno: return path.parse(filePath);
    // Basic implementation for object keys
    const storagePath = this.getStoragePath(filePath);
    const lastSlash = storagePath.lastIndexOf('/');
    const dir = lastSlash === -1 ? '' : storagePath.substring(0, lastSlash);
    const base = lastSlash === -1 ? storagePath : storagePath.substring(lastSlash + 1);
    const lastDot = base.lastIndexOf('.');
    const name = lastDot === -1 ? base : base.substring(0, lastDot);
    const ext = lastDot === -1 ? '' : base.substring(lastDot);
    return { dir, base, name, ext };
  }

  getPublicUrl(filePath: string): string {
    const storagePath = this.getStoragePath(filePath);
    console.log(`SupabaseStorage: Getting public URL for ${storagePath} from bucket ${this.bucketName}`);
    const { data } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(storagePath);

    if (!data || !data.publicUrl) {
        console.warn(`SupabaseStorage: Could not get public URL for ${storagePath}`);
        // Fallback to constructing a path, though this won't be a signed URL
        return `/${this.bucketName}/${storagePath}`; 
    }
    return data.publicUrl;
  }
}