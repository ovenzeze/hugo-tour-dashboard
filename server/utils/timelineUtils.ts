// fs and path imports will be replaced by storageService methods
import { IStorageService, ParsedPath } from '../services/storageService'; // Corrected import path

interface AlignmentData {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

export interface TimelineSegment { // Added export
  speaker: string;
  audioFile: string;
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export async function createMergedTimeline(
  segmentsDir: string, // e.g., "podcasts/podcastId/segments" (relative to public)
  storageService: IStorageService
): Promise<TimelineSegment[]> {
  // For LocalStorageService, paths for fs operations are relative to project root.
  // So, segmentsStoragePath will be "public/podcasts/podcastId/segments"
  const segmentsStoragePath = storageService.joinPath('public', segmentsDir);
  
  if (!await storageService.exists(segmentsStoragePath) || !await storageService.isDir(segmentsStoragePath)) {
    console.warn(`Segments directory ${segmentsStoragePath} does not exist or is not a directory.`);
    return [];
  }
  const files = await storageService.listFiles(segmentsStoragePath);

  const timestampFiles = files
    .filter((file: string) => file.endsWith('.json') && !file.startsWith('merged_timeline.json'))
    .sort((a: string, b: string) => {
      // Sort by numeric prefix (e.g., "001_speaker.json", "002_speaker.json")
      const numA = parseInt(a.split('_')[0] || '0');
      const numB = parseInt(b.split('_')[0] || '0');
      return numA - numB;
    });

  const timeline: TimelineSegment[] = [];
  let cumulativeTime = 0;

  for (const tsFileBasename of timestampFiles) { // tsFile is now just the basename
    try {
      const tsFileStoragePath = storageService.joinPath(segmentsStoragePath, tsFileBasename);
      const tsFileContent = await storageService.readFile(tsFileStoragePath, 'utf-8');
      const alignmentData: AlignmentData = JSON.parse(tsFileContent as string);

      if (!alignmentData || !alignmentData.character_end_times_seconds || alignmentData.character_end_times_seconds.length === 0) {
        console.warn(`Skipping ${tsFileBasename} due to missing or empty character_end_times_seconds.`);
        continue;
      }

      const duration = alignmentData.character_end_times_seconds[alignmentData.character_end_times_seconds.length - 1];
      
      // Use storageService.parsePath if it provides similar functionality to path.parse
      // For now, let's assume tsFileBasename is like "001_Speaker_Name.json"
      const nameWithoutExt = tsFileBasename.substring(0, tsFileBasename.lastIndexOf('.'));
      const parts = nameWithoutExt.split('_');
      const speakerNamePart = parts.slice(1).join('_'); // Get "Speaker_Name"
      const speaker = speakerNamePart.replace(/___/g, ' - ');


      const audioFileBasename = `${nameWithoutExt}.mp3`;
      // Paths for public URLs (relative to public dir)
      const audioFilePublicPath = storageService.joinPath(segmentsDir, audioFileBasename);
      const timestampFilePublicPath = storageService.joinPath(segmentsDir, tsFileBasename);

      timeline.push({
        speaker,
        audioFile: storageService.getPublicUrl(audioFilePublicPath),
        timestampFile: storageService.getPublicUrl(timestampFilePublicPath),
        duration,
        startTime: cumulativeTime,
        endTime: cumulativeTime + duration,
      });

      cumulativeTime += duration;
    } catch (error: any) {
      console.error(`Error processing timestamp file ${tsFileBasename}:`, error.message);
    }
  }

  // Save the merged timeline
  // podcastPublicDir will be "podcasts/podcastId"
  const podcastPublicDir = segmentsDir.substring(0, segmentsDir.lastIndexOf('/'));
  // mergedTimelineStoragePath will be "public/podcasts/podcastId/merged_timeline.json"
  const mergedTimelineStoragePath = storageService.joinPath('public', podcastPublicDir, 'merged_timeline.json');
  await storageService.writeFile(mergedTimelineStoragePath, JSON.stringify(timeline, null, 2));
  
  console.log(`Merged timeline saved to ${storageService.getPublicUrl(storageService.joinPath(podcastPublicDir, 'merged_timeline.json'))}`);

  return timeline;
}