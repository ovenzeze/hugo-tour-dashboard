import { writeFileSync, readFileSync, existsSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { sessionId, segments, leftGain = 0, rightGain = 0 } = body;
    
    if (!sessionId) {
      return { 
        success: false, 
        error: "Missing required parameter: sessionId" 
      };
    }
    
    // 设置输出目录
    const outputDir = path.join(process.cwd(), 'podcast_outputs', sessionId);
    const aliceAudioPath = path.join(outputDir, 'alice_audio.mp3');
    const markAudioPath = path.join(outputDir, 'mark_audio.mp3');
    const segmentsPath = path.join(outputDir, 'segments.json');
    
    // 检查必要的文件是否存在
    if (!existsSync(aliceAudioPath) || !existsSync(markAudioPath)) {
      return { 
        success: false, 
        error: "Audio files not found. Please generate audio first." 
      };
    }
    
    // 如果提供了自定义segments，则覆盖原有的segments文件
    if (segments) {
      writeFileSync(segmentsPath, JSON.stringify(segments, null, 2));
    } else if (!existsSync(segmentsPath)) {
      return {
        success: false,
        error: "Segments file not found and no custom segments provided."
      };
    }
    
    // 设置最终播客输出路径
    const podcastOutputPath = path.join(outputDir, 'final_podcast.mp3');
    
    // 调用Python脚本混合音频
    console.log('Mixing podcast...');
    try {
      await execAsync(
        `python podcast_mixer_segments.py mix "${aliceAudioPath}" "${markAudioPath}" "${podcastOutputPath}" --segments "${segmentsPath}" --left-gain ${leftGain} --right-gain ${rightGain}`
      );
    } catch (error) {
      console.error('Error mixing podcast:', error);
      return { 
        success: false, 
        error: `Failed to mix podcast: ${error.message}` 
      };
    }
    
    return {
      success: true,
      podcastUrl: `/api/podcast/files/${sessionId}/final_podcast.mp3`
    };
  } catch (error) {
    console.error('Error in podcast mixing:', error);
    return { 
      success: false, 
      error: `Internal server error: ${error.message}` 
    };
  }
}); 