import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';
import { 
  mergeAudioSegments,
  extractAudioSegments,
  downloadBlobAsFile,
  calculateTotalDuration,
  type AudioSegmentInfo,
  type MergeProgressCallback
} from '~/utils/audioMerger';

export function usePodcastAudioMerger() {
  const isSupported = computed(() => 'AudioContext' in window);
  const isProcessing = ref(false);
  const currentProgress = ref(0);
  const currentSegmentIndex = ref(0);
  const totalSegments = ref(0);
  const currentSegmentText = ref('');

  // 检查浏览器支持
  const checkSupport = () => {
    if (!isSupported.value) {
      toast.error('当前浏览器不支持音频处理功能', {
        description: '请使用最新版本的 Chrome、Firefox 或 Safari 浏览器'
      });
      return false;
    }
    return true;
  };

  // 进度回调函数
  const progressCallback: MergeProgressCallback = (progress, segmentIndex, total, text) => {
    currentProgress.value = progress;
    currentSegmentIndex.value = segmentIndex;
    totalSegments.value = total;
    currentSegmentText.value = text;
  };

  // 合并播客的所有音频段落为完整音频文件
  const mergePodcastAudio = async (podcast: any, gapDuration: number = 0.5) => {
    if (!checkSupport()) return;

    if (!podcast) {
      toast.error('播客数据无效');
      return;
    }

    try {
      isProcessing.value = true;
      currentProgress.value = 0;
      currentSegmentIndex.value = 0;
      totalSegments.value = 0;
      currentSegmentText.value = '准备开始合并...';

      // 从播客数据提取音频段落
      const audioSegments = extractAudioSegments(podcast);
      if (audioSegments.length === 0) {
        toast.error('播客中没有可用的音频段落', {
          description: '请确保播客的段落已完成音频合成'
        });
        return;
      }

      const totalDuration = calculateTotalDuration(audioSegments, gapDuration);
      
      toast.info(`开始合并 ${audioSegments.length} 个音频段落`, {
        description: `预计总时长: ${Math.round(totalDuration / 1000 / 60)}分钟`
      });

      console.log('音频段落信息:', audioSegments);

      // 执行音频合并
      const mergedAudioBlob = await mergeAudioSegments(
        audioSegments,
        progressCallback,
        gapDuration
      );

      // 生成文件名
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `${podcast.title || 'podcast'}_merged_${timestamp}.wav`;

      // 下载文件
      downloadBlobAsFile(mergedAudioBlob, filename);

      toast.success('播客音频合并完成！', {
        description: `已合并 ${audioSegments.length} 个音频段落为完整播客`
      });

    } catch (error) {
      console.error('音频合并失败:', error);
      toast.error('音频合并失败', {
        description: error instanceof Error ? error.message : '未知错误'
      });
    } finally {
      isProcessing.value = false;
      currentProgress.value = 0;
      currentSegmentIndex.value = 0;
      totalSegments.value = 0;
      currentSegmentText.value = '';
    }
  };

  return {
    // 状态
    isSupported,
    isProcessing,
    currentProgress,
    currentSegmentIndex,
    totalSegments,
    currentSegmentText,
    
    // 方法
    checkSupport,
    mergePodcastAudio,
  };
} 