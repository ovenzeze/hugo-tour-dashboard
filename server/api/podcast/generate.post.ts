import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import axios from 'axios';

const execAsync = promisify(exec);

// 确保目录存在
const ensureDir = (dirPath: string) => {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }
}

// 生成唯一ID
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { aliceText, markText, elevenlabsApiKey } = body;
    
    if (!aliceText || !markText || !elevenlabsApiKey) {
      return { 
        success: false, 
        error: "Missing required parameters: aliceText, markText, elevenlabsApiKey" 
      };
    }

    // 创建唯一会话ID
    const sessionId = generateUUID();
    
    // 设置输出目录
    const outputDir = path.join(process.cwd(), 'podcast_outputs', sessionId);
    ensureDir(outputDir);
    
    // 设置ElevenLabs API中使用的语音ID
    // 您可以根据需要更改这些ID，或通过API参数传入
    const aliceVoiceId = "21m00Tcm4TlvDq8ikWAM"; // Rachel声音
    const markVoiceId = "AZnzlk1XvdvUeBnXmlld"; // Domi声音
    
    // 异步调用ElevenLabs API生成两个人的语音和时间戳
    console.log('Generating Alice audio...');
    const aliceResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${aliceVoiceId}/with-timestamps`,
      { text: aliceText },
      { 
        headers: { 
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    // 分离音频和时间戳数据 (ElevenLabs返回二进制音频)
    const aliceAudioPath = path.join(outputDir, 'alice_audio.mp3');
    writeFileSync(aliceAudioPath, Buffer.from(aliceResponse.data));
    
    // 为了获取时间戳，需要再次调用API但不使用arraybuffer响应类型
    const aliceTimestampResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${aliceVoiceId}/with-timestamps`,
      { text: aliceText },
      { 
        headers: { 
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const aliceTimestampsPath = path.join(outputDir, 'alice_timestamps.json');
    writeFileSync(aliceTimestampsPath, JSON.stringify(aliceTimestampResponse.data, null, 2));
    
    console.log('Generating Mark audio...');
    const markResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${markVoiceId}/with-timestamps`,
      { text: markText },
      { 
        headers: { 
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    const markAudioPath = path.join(outputDir, 'mark_audio.mp3');
    writeFileSync(markAudioPath, Buffer.from(markResponse.data));
    
    const markTimestampResponse = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${markVoiceId}/with-timestamps`,
      { text: markText },
      { 
        headers: { 
          'xi-api-key': elevenlabsApiKey,
          'Content-Type': 'application/json'
        }
      }
    );
    
    const markTimestampsPath = path.join(outputDir, 'mark_timestamps.json');
    writeFileSync(markTimestampsPath, JSON.stringify(markTimestampResponse.data, null, 2));
    
    // 用时间戳生成片段列表
    console.log('Generating segments...');
    const segmentsPath = path.join(outputDir, 'segments.json');
    
    // 创建片段模板
    try {
      await execAsync(
        `python podcast_mixer_segments.py create-template "${aliceAudioPath}" "${markAudioPath}" "${segmentsPath}" --elevenlabs-json1 "${aliceTimestampsPath}" --elevenlabs-json2 "${markTimestampsPath}"`
      );
    } catch (error) {
      console.error('Error generating segments:', error);
      return { 
        success: false, 
        error: `Failed to generate segments: ${error.message}` 
      };
    }
    
    return {
      success: true,
      sessionId,
      files: {
        aliceAudio: `/api/podcast/files/${sessionId}/alice_audio.mp3`,
        markAudio: `/api/podcast/files/${sessionId}/mark_audio.mp3`,
        aliceTimestamps: `/api/podcast/files/${sessionId}/alice_timestamps.json`,
        markTimestamps: `/api/podcast/files/${sessionId}/mark_timestamps.json`,
        segments: `/api/podcast/files/${sessionId}/segments.json`
      }
    };
  } catch (error) {
    console.error('Error in podcast generation:', error);
    return { 
      success: false, 
      error: `Internal server error: ${error.message}` 
    };
  }
}); 