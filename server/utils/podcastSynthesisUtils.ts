import { execSync } from 'child_process'; // For executing ffmpeg
import { IStorageService } from '../services/storageService'; // Corrected import path

interface TimelineSegment {
  speaker: string;
  audioFile: string; // Relative path from public, e.g., /audio/timed_segments/file.mp3
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export async function mergeAudioSegmentsForPodcast( // Renamed function
  podcastId: string,
  storageService: IStorageService
): Promise<string> {
  // Paths for storage operations (relative to project root for LocalStorageService)
  const podcastStoragePath = storageService.joinPath('public', 'podcasts', podcastId);
  const timelineStoragePath = storageService.joinPath(podcastStoragePath, 'merged_timeline.json');

  if (!await storageService.exists(timelineStoragePath)) {
      throw new Error(`Timeline file not found at ${timelineStoragePath}`);
  }
  const timelineContent = await storageService.readFile(timelineStoragePath, 'utf-8') as string;
  const timeline: TimelineSegment[] = JSON.parse(timelineContent);

  if (!timeline || timeline.length === 0) {
    throw new Error('Timeline is empty or invalid.');
  }

  const finalOutputFileName = `${podcastId}_final.mp3`;
  const finalOutputStoragePath = storageService.joinPath(podcastStoragePath, finalOutputFileName);

  // Declare fileListStoragePath outside try to be accessible in finally
  const fileListStoragePath = storageService.joinPath(podcastStoragePath, 'ffmpeg_filelist.txt');
  
  // For execSync, we need absolute paths if not running from project root,
  // or paths relative to where execSync runs. storageService.resolvePath can give absolute paths.
  const absoluteFileListPath = storageService.resolvePath(fileListStoragePath);
  const absoluteFinalOutputPath = storageService.resolvePath(finalOutputStoragePath);

  try {
    // Create a list of absolute file paths for ffmpeg
    // segment.audioFile is a public URL like /podcasts/{podcastId}/segments/file.mp3
    // Convert to absolute local path for ffmpeg
    const ffmpegFileListContent = timeline
      .map(segment => {
        // segment.audioFile starts with '/', remove it for joining with 'public'
        const pathFromPublic = segment.audioFile.startsWith('/') ? segment.audioFile.substring(1) : segment.audioFile;
        const absoluteSegmentPath = storageService.resolvePath('public', pathFromPublic);
        return `file '${absoluteSegmentPath}'`;
      })
      .join('\n');
    await storageService.writeFile(fileListStoragePath, ffmpegFileListContent);

    // Construct and execute ffmpeg command
    const ffmpegCommand = `ffmpeg -y -f concat -safe 0 -i "${absoluteFileListPath}" -c copy "${absoluteFinalOutputPath}"`;
    
    console.log(`Executing ffmpeg command for merging: ${ffmpegCommand}`); // Updated log
    execSync(ffmpegCommand, { stdio: 'inherit' });

    console.log(`Successfully merged podcast to ${absoluteFinalOutputPath}`); // Updated log
    // Return public URL path
    return storageService.getPublicUrl(storageService.joinPath('podcasts', podcastId, finalOutputFileName));

  } catch (error: any) {
    console.error('Error during ffmpeg merge execution:', error.message); // Updated log
    if (error.stderr) {
      console.error('FFMPEG stderr:', error.stderr.toString());
    }
    if (error.stdout) {
      console.error('FFMPEG stdout:', error.stdout.toString());
    }
    throw new Error(`Failed to merge podcast audio: ${error.message}`); // Updated log
  } finally {
    // Clean up the temporary file list
    try {
      await storageService.unlink(fileListStoragePath);
    } catch (cleanupError) {
      console.warn(`Failed to delete temporary ffmpeg file list: ${fileListStoragePath}`, cleanupError);
    }
  }
}