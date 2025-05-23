<template>
  <div class="container mx-auto p-6 max-w-4xl">
    <Card>
      <CardHeader>
        <CardTitle>AI脚本生成测试</CardTitle>
        <CardDescription>测试修复后的AI脚本生成功能</CardDescription>
      </CardHeader>
      
      <CardContent class="space-y-6">
        <!-- 测试设置 -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label for="title">播客标题</Label>
            <Input
              id="title"
              v-model="testSettings.title"
              placeholder="输入播客标题"
            />
          </div>
          
          <div>
            <Label for="topic">播客主题</Label>
            <Input
              id="topic"
              v-model="testSettings.topic"
              placeholder="输入播客主题"
            />
          </div>
          
          <div>
            <Label for="language">语言</Label>
            <Select v-model="testSettings.language">
              <SelectTrigger>
                <SelectValue placeholder="选择语言" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="zh-CN">中文</SelectItem>
                <SelectItem value="en-US">English</SelectItem>
                <SelectItem value="ja-JP">日语</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label for="segments">段落数量</Label>
            <Input
              id="segments"
              v-model="testSettings.numberOfSegments"
              type="number"
              min="3"
              max="20"
            />
          </div>
        </div>
        
        <!-- 生成按钮 -->
        <div class="flex gap-4">
          <Button 
            @click="testAiGeneration" 
            :disabled="isLoading"
            class="flex-1"
          >
            <Icon 
              v-if="isLoading" 
              name="ph:spinner" 
              class="w-4 h-4 mr-2 animate-spin" 
            />
            <Icon 
              v-else 
              name="ph:brain" 
              class="w-4 h-4 mr-2" 
            />
            {{ isLoading ? '生成中...' : '测试AI脚本生成' }}
          </Button>
          
          <Button @click="clearResults" variant="outline">
            <Icon name="ph:trash" class="w-4 h-4 mr-2" />
            清除结果
          </Button>
        </div>
        
        <!-- 错误显示 -->
        <Alert v-if="error" variant="destructive">
          <Icon name="ph:warning-circle" class="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{{ error }}</AlertDescription>
        </Alert>
        
        <!-- 结果显示 -->
        <div v-if="result" class="space-y-4">
          <Alert>
            <Icon name="ph:check-circle" class="h-4 w-4" />
            <AlertTitle>生成成功</AlertTitle>
            <AlertDescription>AI脚本已成功生成</AlertDescription>
          </Alert>
          
          <!-- API响应信息 -->
          <div class="p-4 border rounded-lg bg-muted/30">
            <h3 class="font-semibold mb-2">API响应信息</h3>
            <div class="text-sm space-y-1">
              <p><strong>标题:</strong> {{ result.podcastTitle || 'N/A' }}</p>
              <p><strong>语言:</strong> {{ result.language || 'N/A' }}</p>
              <p><strong>段落数量:</strong> {{ result.script?.length || 0 }}</p>
            </div>
          </div>
          
          <!-- 生成的脚本 -->
          <div v-if="result.script && result.script.length > 0">
            <h3 class="font-semibold mb-2">生成的脚本</h3>
            <div class="max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/10">
              <div v-for="(segment, index) in result.script" :key="index" class="mb-3">
                <div class="font-medium text-sm text-primary">
                  {{ segment.speaker || segment.name || `说话者${index + 1}` }}:
                </div>
                <div class="mt-1 text-sm">{{ segment.text }}</div>
              </div>
            </div>
          </div>
          
          <!-- 转换后的脚本文本 -->
          <div v-if="convertedScript">
            <h3 class="font-semibold mb-2">转换后的脚本文本</h3>
            <Textarea 
              :value="convertedScript" 
              readonly 
              class="min-h-48 font-mono text-sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner';

definePageMeta({
  title: 'AI脚本生成测试'
});

// 测试设置
const testSettings = ref({
  title: 'AI技术发展趋势',
  topic: '人工智能技术的未来发展和对社会的影响',
  language: 'zh-CN',
  numberOfSegments: 6
});

// 状态
const isLoading = ref(false);
const error = ref('');
const result = ref<any>(null);

// 转换后的脚本文本
const convertedScript = computed(() => {
  if (!result.value?.script || !Array.isArray(result.value.script)) {
    return '';
  }
  
  return result.value.script
    .filter((segment: any) => {
      const speakerName = segment?.speaker || segment?.name;
      return segment && 
             typeof speakerName === 'string' && speakerName.trim() &&
             typeof segment.text === 'string' && segment.text.trim();
    })
    .map((segment: any) => {
      const speakerName = segment.speaker || segment.name;
      return `${speakerName}: ${segment.text}`;
    })
    .join('\n');
});

// 测试AI生成
async function testAiGeneration() {
  isLoading.value = true;
  error.value = '';
  result.value = null;
  
  try {
    console.log('[Test] 开始AI脚本生成测试，设置:', testSettings.value);
    
    const response = await $fetch('/api/generate-script', {
      method: 'POST',
      body: {
        podcastSettings: {
          title: testSettings.value.title,
          topic: testSettings.value.topic,
          language: testSettings.value.language,
          numberOfSegments: testSettings.value.numberOfSegments,
          style: 'conversational',
          keywords: 'AI, 技术, 未来'
        }
      }
    });
    
    console.log('[Test] AI响应收到:', response);
    result.value = response;
    
    // 检查响应格式
    if (response.script && Array.isArray(response.script)) {
      console.log('[Test] 脚本格式分析:');
      response.script.forEach((segment: any, index: number) => {
        console.log(`段落 ${index + 1}:`, {
          hasSpeaker: !!segment.speaker,
          hasName: !!segment.name,
          speaker: segment.speaker,
          name: segment.name,
          textLength: segment.text?.length || 0
        });
      });
      
      toast.success('AI脚本生成成功！', {
        description: `生成了${response.script.length}个对话段落`
      });
    } else {
      throw new Error('API响应格式不正确或脚本为空');
    }
    
  } catch (err: any) {
    console.error('[Test] AI脚本生成失败:', err);
    error.value = err.message || '未知错误';
    toast.error('AI脚本生成失败', {
      description: error.value
    });
  } finally {
    isLoading.value = false;
  }
}

// 清除结果
function clearResults() {
  result.value = null;
  error.value = '';
  toast.info('结果已清除');
}
</script> 