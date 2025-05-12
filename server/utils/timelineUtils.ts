import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve, join, parse } from 'path';

interface AlignmentData {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

interface TimelineSegment {
  speaker: string;
  audioFile: string;
  timestampFile: string;
  duration: number;
  startTime: number;
  endTime: number;
}

export function createMergedTimeline(segmentsDir: string): TimelineSegment[] {
  const fullSegmentsPath = resolve(process.cwd(), segmentsDir);
  const files = readdirSync(fullSegmentsPath);

  const timestampFiles = files
    .filter(file => file.endsWith('.json') && !file.startsWith('merged_timeline'))
    .sort((a, b) => {
      // Extract timestamp from filename for sorting (e.g., Speaker_Name_1747082049585.json)
      const timeA = parseInt(a.split('_').pop()?.split('.')[0] || '0');
      const timeB = parseInt(b.split('_').pop()?.split('.')[0] || '0');
      return timeA - timeB;
    });

  const timeline: TimelineSegment[] = [];
  let cumulativeTime = 0;

  for (const tsFile of timestampFiles) {
    try {
      const tsFilePath = join(fullSegmentsPath, tsFile);
      const tsFileContent = readFileSync(tsFilePath, 'utf-8');
      const alignmentData: AlignmentData = JSON.parse(tsFileContent);

      if (!alignmentData || !alignmentData.character_end_times_seconds || alignmentData.character_end_times_seconds.length === 0) {
        console.warn(`Skipping ${tsFile} due to missing or empty character_end_times_seconds.`);
        continue;
      }

      const duration = alignmentData.character_end_times_seconds[alignmentData.character_end_times_seconds.length - 1];
      
      const parsedFileName = parse(tsFile);
      // Extract speaker name: "Cybo___Tech_Guide_1747082049585" -> "Cybo - Tech Guide"
      const speakerWithTimestamp = parsedFileName.name;
      const lastUnderscoreIndex = speakerWithTimestamp.lastIndexOf('_');
      const namePart = lastUnderscoreIndex === -1 ? speakerWithTimestamp : speakerWithTimestamp.substring(0, lastUnderscoreIndex);
      const speaker = namePart.replace(/___/g, ' - ');


      const audioFileName = `${parsedFileName.name}.mp3`;
      const audioFileRelativePath = join(segmentsDir.replace('public', ''), audioFileName).replace(/\\/g, '/'); // Relative to public
      const timestampFileRelativePath = join(segmentsDir.replace('public', ''), tsFile).replace(/\\/g, '/');


      timeline.push({
        speaker,
        audioFile: audioFileRelativePath,
        timestampFile: timestampFileRelativePath,
        duration,
        startTime: cumulativeTime,
        endTime: cumulativeTime + duration,
      });

      cumulativeTime += duration;
    } catch (error: any) {
      console.error(`Error processing timestamp file ${tsFile}:`, error.message);
    }
  }

  // Save the merged timeline
  const podcastOutputDir = resolve(fullSegmentsPath, '..'); // Go one level up from segmentsDir
  const mergedTimelinePath = join(podcastOutputDir, 'merged_timeline.json');
  writeFileSync(mergedTimelinePath, JSON.stringify(timeline, null, 2));
  // Construct a user-friendly path for the log message
  const relativeMergedTimelinePath = join(segmentsDir.substring(0, segmentsDir.lastIndexOf('/')), 'merged_timeline.json').replace('public', '');
  console.log(`Merged timeline saved to public${relativeMergedTimelinePath}`);

  return timeline;
}