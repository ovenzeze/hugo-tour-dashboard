<template>
  <div class="min-h-screen bg-background p-8">
    <div class="max-w-4xl mx-auto">
      <h1 class="text-3xl font-bold text-center mb-8">AI Script Generation Test</h1>
      
      <div class="space-y-6">
        <!-- Test Controls -->
        <div class="p-6 border rounded-lg bg-card">
          <h2 class="text-xl font-semibold mb-4">Test Controls</h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label for="title">Podcast Title</Label>
              <Input v-model="testSettings.title" placeholder="AI Technology Trends" />
            </div>
            <div>
              <Label for="topic">Topic</Label>
              <Input v-model="testSettings.topic" placeholder="The future of artificial intelligence" />
            </div>
            <div>
              <Label for="language">Language</Label>
              <Select v-model="testSettings.language">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zh-CN">中文 (Chinese)</SelectItem>
                  <SelectItem value="en-US">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="segments">Number of Segments</Label>
              <Input v-model.number="testSettings.numberOfSegments" type="number" min="3" max="15" />
            </div>
          </div>
          
          <div class="flex gap-4">
            <Button @click="generateTestScript" :disabled="isLoading">
              <Icon v-if="isLoading" name="ph:spinner" class="w-4 h-4 mr-2 animate-spin" />
              <Icon v-else name="ph:brain" class="w-4 h-4 mr-2" />
              {{ isLoading ? 'Generating...' : 'Generate AI Script' }}
            </Button>
            <Button @click="clearResults" variant="outline">
              <Icon name="ph:trash" class="w-4 h-4 mr-2" />
              Clear Results
            </Button>
          </div>
        </div>

        <!-- Results Display -->
        <div v-if="apiResponse" class="space-y-4">
          <!-- API Response Summary -->
          <div class="p-4 border rounded-lg bg-muted/30">
            <h3 class="font-semibold mb-2">API Response Summary</h3>
            <div class="text-sm space-y-1">
              <p><strong>Success:</strong> {{ apiResponse.success ? 'Yes' : 'No' }}</p>
              <p v-if="apiResponse.podcastTitle"><strong>Title:</strong> {{ apiResponse.podcastTitle }}</p>
              <p v-if="apiResponse.language"><strong>Language:</strong> {{ apiResponse.language }}</p>
              <p v-if="apiResponse.script"><strong>Segments Generated:</strong> {{ apiResponse.script.length }}</p>
            </div>
          </div>

          <!-- Generated Script -->
          <div v-if="apiResponse.script" class="p-4 border rounded-lg">
            <h3 class="font-semibold mb-3">Generated Script Segments</h3>
            <div class="space-y-3">
              <div 
                v-for="(segment, index) in apiResponse.script" 
                :key="index"
                class="p-3 border rounded bg-card"
              >
                <div class="flex justify-between items-start mb-2">
                  <Badge variant="outline">Segment {{ index + 1 }}</Badge>
                  <div class="text-xs text-muted-foreground">
                    Speaker: {{ segment.speaker || segment.name || 'Unknown' }}
                    <span v-if="segment.role" class="ml-2">| Role: {{ segment.role }}</span>
                  </div>
                </div>
                <p class="text-sm">{{ segment.text }}</p>
                
                <!-- Field Analysis -->
                <div class="mt-2 text-xs text-muted-foreground space-y-1">
                  <div v-if="segment.speaker">✅ Has 'speaker' field: "{{ segment.speaker }}"</div>
                  <div v-if="segment.name">⚠️ Has 'name' field: "{{ segment.name }}"</div>
                  <div v-if="!segment.speaker && !segment.name">❌ Missing both 'speaker' and 'name' fields</div>
                  <div v-if="segment.speaker && segment.name && segment.speaker !== segment.name">
                    🔥 WARNING: 'speaker' and 'name' fields differ!
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Voice Map -->
          <div v-if="apiResponse.voiceMap" class="p-4 border rounded-lg">
            <h3 class="font-semibold mb-3">Voice Map</h3>
            <div class="space-y-2">
              <div 
                v-for="(voiceData, speakerName) in apiResponse.voiceMap" 
                :key="speakerName"
                class="p-2 border rounded bg-muted/20"
              >
                <div class="text-sm font-medium">{{ speakerName }}</div>
                <div class="text-xs text-muted-foreground">
                  Persona ID: {{ voiceData.personaId }} | 
                  Voice Model: {{ voiceData.voice_model_identifier }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error Display -->
        <div v-if="error" class="p-4 border border-destructive rounded-lg bg-destructive/5">
          <h3 class="font-semibold text-destructive mb-2">Error</h3>
          <p class="text-sm text-destructive">{{ error }}</p>
        </div>

        <!-- Instructions -->
        <div class="p-4 border rounded-lg bg-blue-50 dark:bg-blue-950/20">
          <h3 class="font-semibold mb-2">How to Check Backend Logs</h3>
          <div class="text-sm space-y-1">
            <p>1. Open your terminal where the dev server is running</p>
            <p>2. Look for the following debug sections in the output:</p>
            <ul class="list-disc list-inside ml-4 space-y-1 text-xs">
              <li><code>========== COMPLETE PROMPT START ==========</code> - Shows the full AI prompt</li>
              <li><code>========== RAW AI RESPONSE START ==========</code> - Shows raw AI response</li>
              <li><code>========== SCRIPT ANALYSIS ==========</code> - Shows detailed segment analysis</li>
            </ul>
            <p>3. Check for any warnings about 'name' vs 'speaker' field usage</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';

definePageMeta({
  title: 'AI Script Generation Test'
});

const isLoading = ref(false);
const error = ref('');
const apiResponse = ref<any>(null);

const testSettings = reactive({
  title: 'AI Technology Trends',
  topic: 'The future of artificial intelligence and its impact on society',
  language: 'zh-CN',
  numberOfSegments: 6
});

async function generateTestScript() {
  isLoading.value = true;
  error.value = '';
  apiResponse.value = null;
  
  try {
    console.log('[Test] Sending AI script generation request:', testSettings);
    
    const response = await $fetch('/api/generate-script', {
      method: 'POST',
      body: {
        podcastSettings: {
          title: testSettings.title,
          topic: testSettings.topic,
          language: testSettings.language,
          numberOfSegments: testSettings.numberOfSegments,
          style: 'conversational',
          keywords: 'technology, AI, future'
        }
      }
    });
    
    console.log('[Test] AI script response received:', response);
    apiResponse.value = response;
    
    // 检查响应格式
    if (response.script && Array.isArray(response.script)) {
      console.log('[Test] Script format analysis:');
      response.script.forEach((segment: any, index: number) => {
        console.log(`Segment ${index + 1}:`, {
          hasSpeaker: !!segment.speaker,
          hasName: !!segment.name,
          speaker: segment.speaker,
          name: segment.name,
          fieldsMatch: segment.speaker === segment.name
        });
      });
    }
    
  } catch (err: any) {
    console.error('[Test] AI script generation failed:', err);
    error.value = err.message || 'Unknown error occurred';
  } finally {
    isLoading.value = false;
  }
}

function clearResults() {
  apiResponse.value = null;
  error.value = '';
}
</script> 