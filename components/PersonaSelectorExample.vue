<template>
  <div class="space-y-8">
    <!-- 控制面板 -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Demo Controls</CardTitle>
        <CardDescription>Configure the PersonaSelector demo settings</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="flex items-center space-x-2">
            <Checkbox id="multiple" v-model:checked="demoSettings.multiple" />
            <Label for="multiple" class="text-sm">Multiple selection</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox id="filterable" v-model:checked="demoSettings.filterable" />
            <Label for="filterable" class="text-sm">Enable search</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox id="enableFilters" v-model:checked="demoSettings.enableFilters" />
            <Label for="enableFilters" class="text-sm">Advanced filters</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox id="showQuickFilters" v-model:checked="demoSettings.showQuickFilters" />
            <Label for="showQuickFilters" class="text-sm">Quick filters</Label>
          </div>
          <div class="flex items-center space-x-2">
            <Checkbox id="disabled" v-model:checked="demoSettings.disabled" />
            <Label for="disabled" class="text-sm">Disabled</Label>
          </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label for="maxSelection" class="text-sm">Max Selection (for multiple mode)</Label>
            <Input 
              id="maxSelection" 
              v-model.number="demoSettings.maxSelection" 
              type="number" 
              min="1" 
              max="10" 
              class="mt-1"
            />
          </div>
          <div>
            <Label for="pageSize" class="text-sm">Page Size</Label>
            <Input 
              id="pageSize" 
              v-model.number="demoSettings.pageSize" 
              type="number" 
              min="5" 
              max="50" 
              class="mt-1"
            />
          </div>
        </div>
        
        <div>
          <Label for="placeholder" class="text-sm">Placeholder Text</Label>
          <Input 
            id="placeholder" 
            v-model="demoSettings.placeholder" 
            class="mt-1"
          />
        </div>
      </CardContent>
    </Card>

    <!-- PersonaSelector 演示 -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">PersonaSelector Demo</CardTitle>
        <CardDescription>
          Interactive demonstration of the enhanced PersonaSelector component
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PersonaSelector
          v-model="selectedValue"
          :personas="personas"
          :multiple="demoSettings.multiple"
          :label="demoSettings.multiple ? 'Select Multiple Personas' : 'Select a Persona'"
          :placeholder="demoSettings.placeholder"
          :description="demoSettings.multiple ? 'Choose multiple personas as guests' : 'Choose a persona as host'"
          :filterable="demoSettings.filterable"
          :disabled="demoSettings.disabled"
          :maxSelection="demoSettings.multiple ? demoSettings.maxSelection : undefined"
          :enableFilters="demoSettings.enableFilters"
          :showQuickFilters="demoSettings.showQuickFilters"
          :pageSize="demoSettings.pageSize"
          @change="onSelectionChange"
        />
        
        <!-- 显示选中的值 -->
        <div class="mt-6 space-y-4">
          <div class="p-4 bg-muted/50 rounded-lg border">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:code" class="h-4 w-4" />
              Current Selection (v-model value)
            </h4>
            <pre class="text-xs bg-background p-3 rounded border overflow-auto">{{ JSON.stringify(selectedValue, null, 2) }}</pre>
          </div>
          
          <div v-if="selectedPersonasData" class="p-4 bg-muted/50 rounded-lg border">
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:user-circle" class="h-4 w-4" />
              Selected Persona Data
            </h4>
            <div v-if="Array.isArray(selectedPersonasData)" class="space-y-2">
              <PersonaCard 
                v-for="persona in selectedPersonasData" 
                :key="persona.persona_id"
                :persona="persona"
                size="sm"
              />
            </div>
            <PersonaCard 
              v-else
              :persona="selectedPersonasData"
              size="sm"
            />
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- 使用示例代码 -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">Usage Example</CardTitle>
        <CardDescription>
          Code example for the current configuration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="relative">
          <pre class="text-sm bg-muted p-4 rounded-lg overflow-auto"><code>{{ usageCode }}</code></pre>
          <Button 
            variant="outline" 
            size="sm" 
            class="absolute top-2 right-2"
            @click="copyCode"
          >
            <Icon name="ph:copy" class="h-3 w-3 mr-1" />
            Copy
          </Button>
        </div>
      </CardContent>
    </Card>

    <!-- 功能特性说明 -->
    <Card>
      <CardHeader>
        <CardTitle class="text-lg">New Features</CardTitle>
        <CardDescription>
          Enhanced PersonaSelector capabilities
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:funnel" class="h-4 w-4 text-primary" />
              Advanced Filtering
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Language support filtering</li>
              <li>• Status filtering (active/inactive/deprecated)</li>
              <li>• TTS provider filtering</li>
              <li>• Quick language filter badges</li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:lightning" class="h-4 w-4 text-primary" />
              Performance Optimizations
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Debounced search input</li>
              <li>• Pagination for large datasets</li>
              <li>• Virtual scrolling ready</li>
              <li>• Lazy loading support</li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:paint-brush" class="h-4 w-4 text-primary" />
              Enhanced UI/UX
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Improved visual design</li>
              <li>• Better loading/error states</li>
              <li>• Status badges</li>
              <li>• Rich persona information display</li>
            </ul>
          </div>
          
          <div>
            <h4 class="text-sm font-semibold mb-2 flex items-center gap-2">
              <Icon name="ph:gear" class="h-4 w-4 text-primary" />
              Advanced Options
            </h4>
            <ul class="text-sm text-muted-foreground space-y-1">
              <li>• Maximum selection limits</li>
              <li>• Customizable page sizes</li>
              <li>• Event-driven architecture</li>
              <li>• Better accessibility support</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { toast } from 'vue-sonner';

// Import PersonaCard component for displaying selected personas
import PersonaCard from '~/components/PersonaCard.vue';

// Import unified ApiPersona type
import type { ApiPersona } from '~/pages/personas/index.vue';

// Demo settings
const demoSettings = ref({
  multiple: false,
  filterable: true,
  disabled: false,
  enableFilters: true,
  showQuickFilters: true,
  maxSelection: 3,
  pageSize: 20,
  placeholder: 'Search and select personas...'
});

// Selection state
const selectedValue = ref<number | number[] | null>(null);
const selectedPersonasData = ref<ApiPersona | ApiPersona[] | null>(null);

// Reset selectedValue when switching between single/multiple mode
watch(() => demoSettings.value.multiple, (isMultiple) => {
  if (isMultiple) {
    selectedValue.value = Array.isArray(selectedValue.value) ? selectedValue.value : [];
  } else {
    selectedValue.value = Array.isArray(selectedValue.value) 
      ? (selectedValue.value.length > 0 ? selectedValue.value[0] : null)
      : selectedValue.value;
  }
});

// Handle selection changes
const onSelectionChange = (selected: ApiPersona | ApiPersona[] | null) => {
  selectedPersonasData.value = selected;
  console.log('Selection changed:', selected);
};

// Mock personas data with enhanced information
const personas = ref<ApiPersona[]>([
  {
    persona_id: 1,
    name: 'Dr. Sarah Chen',
    description: 'A knowledgeable historian specializing in ancient civilizations and cultural heritage preservation.',
    avatar_url: '/avatars/historian.png',
    scenario: 'Museum guide for historical exhibitions',
    status: 'active',
    system_prompt: 'You are Dr. Sarah Chen, a passionate historian with expertise in ancient civilizations. Speak with enthusiasm about historical discoveries and cultural significance.',
    voice_settings: null,
    voice_description: 'Warm, professional voice with slight academic tone',
    tts_provider: 'ElevenLabs',
    language_support: ['en', 'zh'],
    voice_model_identifier: 'sarah_historian_v1',
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-20T15:30:00Z'
  },
  {
    persona_id: 2,
    name: 'Professor Alex Rivera',
    description: 'A brilliant scientist who makes complex scientific concepts accessible to everyone through clear explanations.',
    avatar_url: '/avatars/scientist.png',
    scenario: 'Science exhibition guide',
    status: 'active',
    system_prompt: 'You are Professor Alex Rivera, a scientist who loves to explain complex concepts in simple terms. Be curious and encouraging.',
    voice_settings: '{"speed": 1.0, "pitch": 0.8}',
    voice_description: 'Clear, engaging voice with natural enthusiasm',
    tts_provider: 'OpenAI TTS',
    language_support: ['en', 'es', 'fr'],
    voice_model_identifier: 'alex_scientist_v2',
    created_at: '2024-01-10T08:30:00Z',
    updated_at: '2024-01-25T12:00:00Z'
  },
  {
    persona_id: 3,
    name: 'Maya Tanaka',
    description: 'A contemporary artist who explores the intersection of traditional and modern art forms.',
    avatar_url: '/avatars/artist.png',
    scenario: 'Art gallery curator',
    status: 'active',
    system_prompt: 'You are Maya Tanaka, a contemporary artist with deep appreciation for both traditional and modern art. Speak with creativity and insight.',
    voice_settings: '{"speed": 0.9, "pitch": 1.1}',
    voice_description: 'Artistic, expressive voice with creative flair',
    tts_provider: 'Azure TTS',
    language_support: ['en', 'ja'],
    voice_model_identifier: 'maya_artist_v1',
    created_at: '2024-01-12T14:20:00Z',
    updated_at: '2024-01-22T09:45:00Z'
  },
  {
    persona_id: 4,
    name: 'Chef Marco Rossi',
    description: 'A master chef with expertise in Italian cuisine and culinary history, passionate about food culture.',
    avatar_url: '/avatars/chef.png',
    scenario: 'Culinary exhibition guide',
    status: 'inactive',
    system_prompt: 'You are Chef Marco Rossi, passionate about Italian cuisine and culinary traditions. Share your love for cooking with enthusiasm.',
    voice_settings: '{"speed": 1.1, "pitch": 0.9}',
    voice_description: 'Warm Italian accent with passionate delivery',
    tts_provider: 'ElevenLabs',
    language_support: ['en', 'it'],
    voice_model_identifier: 'marco_chef_v1',
    created_at: '2024-01-08T16:00:00Z',
    updated_at: '2024-01-18T11:30:00Z'
  },
  {
    persona_id: 5,
    name: 'Sam Rodriguez',
    description: 'A skilled software developer who enjoys teaching programming concepts and sharing technical knowledge.',
    avatar_url: '/avatars/developer.png',
    scenario: 'Technology exhibition guide',
    status: 'deprecated',
    system_prompt: 'You are Sam Rodriguez, a friendly developer who loves to explain technology in an approachable way.',
    voice_settings: '{"speed": 1.0, "pitch": 1.0}',
    voice_description: 'Friendly, tech-savvy voice with clear articulation',
    tts_provider: 'OpenAI TTS',
    language_support: ['en', 'es'],
    voice_model_identifier: 'sam_dev_v1',
    created_at: '2024-01-05T12:00:00Z',
    updated_at: '2024-01-15T14:20:00Z'
  },
  {
    persona_id: 6,
    name: 'Dr. Yuki Yamamoto',
    description: 'A marine biologist specializing in ocean conservation and marine ecosystem research.',
    avatar_url: '/avatars/marine_biologist.png',
    scenario: 'Aquarium and ocean exhibition guide',
    status: 'active',
    system_prompt: 'You are Dr. Yuki Yamamoto, a marine biologist passionate about ocean conservation. Share fascinating marine life facts.',
    voice_settings: '{"speed": 0.95, "pitch": 1.05}',
    voice_description: 'Calm, knowledgeable voice with nature-loving tone',
    tts_provider: 'Azure TTS',
    language_support: ['en', 'ja', 'zh'],
    voice_model_identifier: 'yuki_marine_v1',
    created_at: '2024-01-20T09:15:00Z',
    updated_at: '2024-01-28T16:45:00Z'
  }
]);

// Generate usage code dynamically
const usageCode = computed(() => {
  const props = [];
  
  props.push('v-model="selectedValue"');
  props.push(':personas="personas"');
  
  if (demoSettings.value.multiple) props.push(':multiple="true"');
  if (!demoSettings.value.filterable) props.push(':filterable="false"');
  if (demoSettings.value.disabled) props.push(':disabled="true"');
  if (demoSettings.value.enableFilters) props.push(':enableFilters="true"');
  if (demoSettings.value.showQuickFilters) props.push(':showQuickFilters="true"');
  if (demoSettings.value.multiple && demoSettings.value.maxSelection) {
    props.push(`:maxSelection="${demoSettings.value.maxSelection}"`);
  }
  if (demoSettings.value.pageSize !== 20) props.push(`:pageSize="${demoSettings.value.pageSize}"`);
  
  props.push(`label="${demoSettings.value.multiple ? 'Select Multiple Personas' : 'Select a Persona'}"`);
  props.push(`placeholder="${demoSettings.value.placeholder}"`);
  props.push(`description="${demoSettings.value.multiple ? 'Choose multiple personas as guests' : 'Choose a persona as host'}"`);
  
  const propsString = props.map(prop => `  ${prop}`).join('\n');
  
  return `<template>
  <PersonaSelector
${propsString}
    @change="onSelectionChange"
  />
</template>

<script setup lang="ts">
import type { ApiPersona } from '~/pages/personas/index.vue';

const selectedValue = ref<${demoSettings.value.multiple ? 'number[]' : 'number | null'}>(${demoSettings.value.multiple ? '[]' : 'null'});

const onSelectionChange = (selected: ApiPersona | ApiPersona[] | null) => {
  console.log('Selection changed:', selected);
};
<\/script>`;
});

// Copy code to clipboard
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(usageCode.value);
    toast.success('Code copied to clipboard!');
  } catch (err) {
    console.error('Failed to copy code:', err);
    toast.error('Failed to copy code');
  }
};
</script>
