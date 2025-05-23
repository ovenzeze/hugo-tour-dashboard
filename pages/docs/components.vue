<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-3xl font-bold mb-8">Component Documentation</h1>
    
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
      <!-- Sidebar Navigation -->
      <div class="md:col-span-1">
        <div class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-4 sticky top-20">
          <h2 class="text-lg font-semibold mb-4">Component List</h2>
          <ul class="space-y-2">
            <li>
              <a 
                href="#persona-selector" 
                class="block px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                :class="{ 'bg-gray-100 dark:bg-zinc-800 font-medium': activeSection === 'persona-selector' }"
                @click.prevent="scrollToSection('persona-selector')"
              >
                PersonaSelector
              </a>
            </li>
            <!-- More components can be added in the future -->
          </ul>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="md:col-span-3">
        <!-- UnifiedPersonaSelector Component Documentation -->
        <section id="persona-selector" class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 mb-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">UnifiedPersonaSelector</h2>
            <Badge variant="outline" class="text-xs">UI Component</Badge>
          </div>
          
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            UnifiedPersonaSelector is a comprehensive persona selection component built on shadcn/ui's Popover and Command components.
            It supports both single and multiple selection modes with rich visual features including avatars, badges, and language tags.
          </p>
          
          <!-- Features -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">Features</h3>
            <ul class="list-disc pl-5 space-y-1">
              <li>Supports single and multiple selection modes</li>
              <li>Supports search filtering</li>
              <li>Displays selected item tags</li>
              <li>Supports disabled state</li>
              <li>Supports custom labels and descriptions</li>
            </ul>
          </div>
          
          <!-- Examples -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">Examples</h3>
            
            <Tabs default-value="preview" class="mb-6">
              <TabsList>
                <TabsTrigger value="preview">Preview</TabsTrigger>
                <TabsTrigger value="code">Code</TabsTrigger>
              </TabsList>
              <TabsContent value="preview" class="p-4 border rounded-md mt-2">
                <div class="max-w-md mx-auto space-y-4">
                  <!-- Single Selection Example -->
                  <div>
                    <Label class="text-sm font-medium mb-2 block">Single Selection</Label>
                    <UnifiedPersonaSelector
                      v-model:value="singleValue"
                      :personas="mockPersonas"
                      selection-mode="single"
                      placeholder="Select a persona..."
                    />
                  </div>
                  
                  <!-- Multiple Selection Example -->
                  <div>
                    <Label class="text-sm font-medium mb-2 block">Multiple Selection</Label>
                    <UnifiedPersonaSelector
                      v-model:value="multipleValue"
                      :personas="mockPersonas"
                      selection-mode="multiple"
                      placeholder="Select personas..."
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="code" class="mt-2">
                <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code>&lt;template&gt;
  &lt;div class="space-y-4"&gt;
    &lt;!-- Single Selection --&gt;
    &lt;div&gt;
      &lt;Label class="text-sm font-medium mb-2 block"&gt;Single Selection&lt;/Label&gt;
      &lt;UnifiedPersonaSelector
        v-model:value="singleValue"
        :personas="mockPersonas"
        selection-mode="single"
        placeholder="Select a persona..."
      /&gt;
    &lt;/div&gt;
    
    &lt;!-- Multiple Selection --&gt;
    &lt;div&gt;
      &lt;Label class="text-sm font-medium mb-2 block"&gt;Multiple Selection&lt;/Label&gt;
      &lt;UnifiedPersonaSelector
        v-model:value="multipleValue"
        :personas="mockPersonas"
        selection-mode="multiple"
        placeholder="Select personas..."
      /&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue'

// Selection state
const singleValue = ref&lt;number | null&gt;(null)
const multipleValue = ref&lt;number[]&gt;([])

// Mock persona data
const mockPersonas = ref([
  {
    persona_id: 1,
    name: 'Dr. Sarah Chen',
    description: 'A knowledgeable historian specializing in ancient civilizations',
    tts_provider: 'ElevenLabs',
    language_support: ['en-US', 'zh-CN'],
    is_recommended_host: true,
    is_recommended_guest: false,
    // ... other properties
  },
  // ... more personas
])
&lt;/script&gt;</code></pre>
              </TabsContent>
            </Tabs>
          </div>
          
          <!-- API Documentation -->
          <div class="mb-8">
            <h3 class="text-lg font-semibold mb-3">API</h3>
            
            <h4 class="font-medium mb-2">Props</h4>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Prop Name</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Type</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Default</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">modelValue</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">number | number[] | null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Selected persona ID or array of IDs</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">personas</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">ApiPersona[]</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">[]</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Persona data list</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">multiple</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Whether multiple selection is supported</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">filterable</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Whether search filtering is supported</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">disabled</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Whether disabled</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">label</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Label text</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">placeholder</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Input placeholder text</td>
                  </tr>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">description</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Description text</td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <h4 class="font-medium mt-4 mb-2">Events</h4>
            <div class="overflow-x-auto">
              <table class="w-full border-collapse">
                <thead>
                  <tr>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Event Name</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Parameters</th>
                    <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Description</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">update:modelValue</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">number | number[] | null</td>
                    <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Triggered when the selected value changes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Best Practices -->
          <div>
            <h3 class="text-lg font-semibold mb-3">Best Practices</h3>
            <ul class="list-disc pl-5 space-y-2">
              <li>
                <strong>Single Selection Mode</strong>: Use when you only need to select one persona, e.g., selecting a host or speaker.
              </li>
              <li>
                <strong>Multiple Selection Mode</strong>: Use when you need to select multiple personas, e.g., selecting guests or participants.
              </li>
              <li>
                <strong>Search Functionality</strong>: When the persona list is long, it is recommended to enable the search function (filterable=true) to improve user experience.
              </li>
              <li>
                <strong>Description Text</strong>: Provide clear description text to help users understand the purpose and requirements of the selection.
              </li>
            </ul>
          </div>
        </section>
        
        <!-- More component documentation can be added in the future -->
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
definePageMeta({
  title: 'Component Documentation'
});

// Current active section
const activeSection = ref('persona-selector');

// Demo data for examples
const singleValue = ref<number | null>(null);
const multipleValue = ref<number[]>([]);

const mockPersonas = ref([
  {
    persona_id: 1,
    name: 'Dr. Sarah Chen',
    description: 'A knowledgeable historian specializing in ancient civilizations',
    tts_provider: 'ElevenLabs',
    language_support: ['en-US', 'zh-CN'],
    is_recommended_host: true,
    is_recommended_guest: false,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    avatar_url: null,
    voice_model_identifier: 'sarah_historian',
    provider_voice_id: 'sarah_123',
    voice_characteristics: null
  },
  {
    persona_id: 2,
    name: 'Prof. Alex Rivera',
    description: 'Brilliant scientist who explains complex concepts clearly',
    tts_provider: 'OpenAI',
    language_support: ['en-US', 'es-ES'],
    is_recommended_host: false,
    is_recommended_guest: true,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    avatar_url: null,
    voice_model_identifier: 'alex_scientist',
    provider_voice_id: 'alex_456',
    voice_characteristics: null
  }
]);

// Scroll to a specific section
const scrollToSection = (sectionId: string) => {
  const element = document.getElementById(sectionId);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
    activeSection.value = sectionId;
  }
};

// Listen for scroll events to update the current active section
const handleScroll = () => {
  const sections = document.querySelectorAll('section[id]');
  let currentSection = '';
  
  sections.forEach((section) => {
    const htmlSection = section as HTMLElement;
    const sectionTop = htmlSection.offsetTop;
    const sectionHeight = htmlSection.clientHeight;
    
    if (window.scrollY >= sectionTop - 100 && window.scrollY < sectionTop + sectionHeight - 100) {
      currentSection = section.getAttribute('id') || '';
    }
  });
  
  if (currentSection) {
    activeSection.value = currentSection;
  }
};

onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>
