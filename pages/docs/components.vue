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
        <!-- PersonaSelector Component Documentation -->
        <section id="persona-selector" class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6 mb-8">
          <div class="flex items-center justify-between mb-6">
            <h2 class="text-2xl font-bold">PersonaSelector</h2>
            <Badge variant="outline" class="text-xs">UI Component</Badge>
          </div>
          
          <p class="text-gray-600 dark:text-gray-300 mb-6">
            PersonaSelector is a searchable advanced selector component supporting multiple and single selection, used for selecting personas.
            It is built on shadcn/ui's Combobox component and provides rich features and a good user experience.
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
                <PersonaSelectorExample />
              </TabsContent>
              <TabsContent value="code" class="mt-2">
                <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code>&lt;template&gt;
  &lt;div class="space-y-8"&gt;
    &lt;div&gt;
      &lt;h2 class="text-lg font-medium mb-4"&gt;Single Selection Mode&lt;/h2&gt;
      &lt;PersonaSelector
        v-model="selectedPersona"
        :personas="personas"
        label="Select a Persona"
        placeholder="Search persona..."
        description="Please select a persona as the host"
        :filterable="true"
      /&gt;
    &lt;/div&gt;

    &lt;div&gt;
      &lt;h2 class="text-lg font-medium mb-4"&gt;Multiple Selection Mode&lt;/h2&gt;
      &lt;PersonaSelector
        v-model="selectedPersonas"
        :personas="personas"
        :multiple="true"
        label="Select Multiple Personas"
        placeholder="Search persona..."
        description="Please select multiple personas as guests"
        :filterable="true"
      /&gt;
    &lt;/div&gt;
  &lt;/div&gt;
&lt;/template&gt;

&lt;script setup lang="ts"&gt;
import { ref } from 'vue';
import type { ApiPersona } from '~/pages/personas/index.vue';

// Single selection mode
const selectedPersona = ref&lt;number | null&gt;(null);

// Multiple selection mode
const selectedPersonas = ref&lt;number[]&gt;([]);

// Persona data
const personas = ref&lt;ApiPersona[]&gt;([
  {
    persona_id: 1,
    name: 'Historian',
    description: 'Focuses on historical events and cultural background',
    // other properties...
  },
  // other personas...
]);
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
import PersonaSelectorExample from '~/components/PersonaSelectorExample.vue';

definePageMeta({
  title: 'Component Documentation'
});

// Current active section
const activeSection = ref('persona-selector');

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
