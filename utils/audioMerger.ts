export interface AudioSegmentInfo {
  audioUrl: string;
  speaker: string;
  idx: number;
  duration?: number;
}

export interface MergeProgressCallback {
  (progress: number, currentSegment: number, totalSegments: number, currentSegmentInfo: string): void;
}

/**
 * 从播客数据中提取音频段落信息
 */
export function extractAudioSegments(podcast: any): AudioSegmentInfo[] {
  if (!podcast?.podcast_segments) {
    return [];
  }

  return podcast.podcast_segments
    .filter((segment: any) => {
      // 检查是否有可用的音频文件
      return segment.segment_audios && 
             segment.segment_audios.length > 0 && 
             segment.segment_audios.some((audio: any) => audio.audio_url);
    })
    .map((segment: any) => {
      // 优先选择final版本，否则选择第一个可用的音频
      const finalAudio = segment.segment_audios.find((audio: any) => 
        audio.version_tag === 'final' && audio.audio_url
      );
      const audioToUse = finalAudio || segment.segment_audios.find((audio: any) => audio.audio_url);

      return {
        audioUrl: audioToUse.audio_url,
        speaker: segment.speaker || '未知说话者',
        idx: segment.idx || 0,
        duration: audioToUse.duration_ms
      };
    })
    .sort((a: AudioSegmentInfo, b: AudioSegmentInfo) => a.idx - b.idx); // 按索引排序
}

/**
 * 从URL加载音频文件为AudioBuffer
 */
async function loadAudioFromUrl(url: string, audioContext: AudioContext): Promise<AudioBuffer> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch audio: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  } catch (error) {
    throw new Error(`Error loading audio from ${url}: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 合并多个AudioBuffer为一个
 */
function mergeAudioBuffers(audioBuffers: AudioBuffer[], audioContext: AudioContext, gapDuration: number = 0.5): AudioBuffer {
  if (audioBuffers.length === 0) {
    throw new Error('没有音频文件可合并');
  }

  if (audioBuffers.length === 1) {
    return audioBuffers[0];
  }

  // 计算总长度（包括间隔）
  const sampleRate = audioBuffers[0].sampleRate;
  const gapSamples = Math.floor(gapDuration * sampleRate);
  const totalSamples = audioBuffers.reduce((total, buffer) => total + buffer.length, 0) + 
                      (audioBuffers.length - 1) * gapSamples;

  // 获取最大声道数
  const maxChannels = Math.max(...audioBuffers.map(buffer => buffer.numberOfChannels));

  // 创建新的合并后的AudioBuffer
  const mergedBuffer = audioContext.createBuffer(maxChannels, totalSamples, sampleRate);

  let currentOffset = 0;

  for (let bufferIndex = 0; bufferIndex < audioBuffers.length; bufferIndex++) {
    const buffer = audioBuffers[bufferIndex];
    
    // 复制每个声道的数据
    for (let channel = 0; channel < maxChannels; channel++) {
      const mergedChannelData = mergedBuffer.getChannelData(channel);
      
      if (channel < buffer.numberOfChannels) {
        // 如果源buffer有这个声道，复制数据
        const sourceChannelData = buffer.getChannelData(channel);
        mergedChannelData.set(sourceChannelData, currentOffset);
      } else {
        // 如果源buffer没有这个声道，填充静音
        for (let i = 0; i < buffer.length; i++) {
          mergedChannelData[currentOffset + i] = 0;
        }
      }
    }

    currentOffset += buffer.length;

    // 在段落之间添加间隔（除了最后一个段落）
    if (bufferIndex < audioBuffers.length - 1) {
      // 间隔已经是静音，因为AudioBuffer默认初始化为0
      currentOffset += gapSamples;
    }
  }

  return mergedBuffer;
}

/**
 * 将AudioBuffer转换为WAV格式的Blob
 */
function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numberOfChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numberOfChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = audioBuffer.length * blockAlign;
  const bufferSize = 44 + dataSize;

  const arrayBuffer = new ArrayBuffer(bufferSize);
  const view = new DataView(arrayBuffer);

  // WAV文件头
  const writeString = (offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, bufferSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numberOfChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // 音频数据
  let offset = 44;
  for (let i = 0; i < audioBuffer.length; i++) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sample = audioBuffer.getChannelData(channel)[i];
      const intSample = Math.max(-1, Math.min(1, sample)) * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

/**
 * 合并多个音频文件URL为一个完整的音频文件
 */
export async function mergeAudioSegments(
  segments: AudioSegmentInfo[],
  progressCallback?: MergeProgressCallback,
  gapDuration: number = 0.5
): Promise<Blob> {
  if (segments.length === 0) {
    throw new Error('没有音频段落可合并');
  }

  try {
    const audioContext = new AudioContext();
    const audioBuffers: AudioBuffer[] = [];

    // 加载所有音频文件
    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      
      if (progressCallback) {
        progressCallback(
          (i / segments.length) * 50, // 前50%用于加载
          i,
          segments.length,
          `Loading audio: ${segment.speaker} (${i + 1}/${segments.length})`
        );
      }

      try {
        const audioBuffer = await loadAudioFromUrl(segment.audioUrl, audioContext);
        audioBuffers.push(audioBuffer);
      } catch (error) {
        console.warn(`Failed to load audio for segment ${i + 1} (${segment.speaker}):`, error);
        // 可以选择跳过这个段落或者抛出错误
        throw new Error(`Failed to load audio for segment: ${segment.speaker}`);
      }
    }

    if (progressCallback) {
      progressCallback(75, segments.length, segments.length, 'Merging audio segments...');
    }

    // 合并所有AudioBuffer
    const mergedBuffer = mergeAudioBuffers(audioBuffers, audioContext, gapDuration);

    if (progressCallback) {
      progressCallback(90, segments.length, segments.length, 'Converting to audio file...');
    }

    // 转换为WAV文件
    const wavBlob = audioBufferToWav(mergedBuffer);

    if (progressCallback) {
      progressCallback(100, segments.length, segments.length, 'Audio merge complete!');
    }

    // 清理AudioContext
    await audioContext.close();

    return wavBlob;

  } catch (error) {
    throw new Error(`音频合并失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 下载Blob为文件
 */
export function downloadBlobAsFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 计算合并后的总时长（估算）
 */
export function calculateTotalDuration(segments: AudioSegmentInfo[], gapDuration: number = 0.5): number {
  const totalAudioDuration = segments.reduce((total, segment) => {
    return total + (segment.duration || 0);
  }, 0);
  
  const totalGapDuration = (segments.length - 1) * gapDuration * 1000; // 转换为毫秒
  
  return totalAudioDuration + totalGapDuration;
} 