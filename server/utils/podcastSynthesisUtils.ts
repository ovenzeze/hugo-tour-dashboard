import { readFileSync, writeFileSync, unlinkSync } from 'fs';
import { resolve, join } from 'path';
import { execSync } from 'child_process'; // For executing ffmpeg

interface TimelineSegment {
  speaker: string;
  audioFile: string; // Relative path from public, e.g., /audio/timed_segments/file.mp3
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export async function synthesizeBasicPodcast(
  podcastId: string
): Promise<string> {
  const podcastBaseDir = resolve(process.cwd(), 'public/podcasts', podcastId);
  const timelineFilePath = join(podcastBaseDir, 'merged_timeline.json'); // Corrected path

  if (!readFileSync(timelineFilePath)) { // Check if timeline file exists
      throw new Error(`Timeline file not found at ${timelineFilePath}`);
  }
  const timelineContent = readFileSync(timelineFilePath, 'utf-8');
  const timeline: TimelineSegment[] = JSON.parse(timelineContent);

  if (!timeline || timeline.length === 0) {
    throw new Error('Timeline is empty or invalid.');
  }

  const publicDir = resolve(process.cwd(), 'public'); // Used for resolving segment audioFile paths
  const finalOutputFileName = `${podcastId}_final.mp3`;
  const finalOutputPath = join(podcastBaseDir, finalOutputFileName); // Save in podcastId folder

  const fileListPath = join(podcastBaseDir, 'ffmpeg_filelist.txt'); // Temporary file list in podcastId folder

  try {
    // Create a list of absolute file paths for ffmpeg
    // segment.audioFile is like /podcasts/{podcastId}/segments/file.mp3
    // We need to join it with publicDir to get absolute path
    const ffmpegFileListContent = timeline
      .map(segment => `file '${join(publicDir, segment.audioFile)}'`)
      .join('\n');
    writeFileSync(fileListPath, ffmpegFileListContent);

    // Construct and execute ffmpeg command
    // Using -safe 0 is necessary if paths are not considered "safe" by ffmpeg by default
    // -y overwrites output file if it exists
    const ffmpegCommand = `ffmpeg -y -f concat -safe 0 -i "${fileListPath}" -c copy "${finalOutputPath}"`;
    
    console.log(`Executing ffmpeg command: ${ffmpegCommand}`);
    execSync(ffmpegCommand, { stdio: 'inherit' }); // stdio: 'inherit' will show ffmpeg output in console

    console.log(`Successfully synthesized podcast to ${finalOutputPath}`);
    return `/podcasts/${podcastId}/${finalOutputFileName}`; // Return relative path for URL access

  } catch (error: any) {
    console.error('Error during ffmpeg execution:', error.message);
    if (error.stderr) {
      console.error('FFMPEG stderr:', error.stderr.toString());
    }
    if (error.stdout) {
      console.error('FFMPEG stdout:', error.stdout.toString());
    }
    throw new Error(`Failed to synthesize podcast: ${error.message}`);
  } finally {
    // Clean up the temporary file list
    try {
      unlinkSync(fileListPath);
    } catch (cleanupError) {
      console.warn(`Failed to delete temporary ffmpeg file list: ${fileListPath}`, cleanupError);
    }
  }
}