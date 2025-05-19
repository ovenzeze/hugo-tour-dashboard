<template>
  <div class="container mx-auto py-8 px-4">
    <h1 class="text-2xl font-bold mb-6">Persona Selector Component Demo</h1>
    
    <div class="bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <PersonaSelectorExample />
    </div>
    
    <div class="mt-8 bg-white dark:bg-zinc-900 rounded-lg shadow-md p-6">
      <h2 class="text-xl font-semibold mb-4">Component Description</h2>
      
      <div class="prose dark:prose-invert max-w-none">
        <h3>Features</h3>
        <ul>
          <li>Supports single and multiple selection modes</li>
          <li>Supports search filtering</li>
          <li>Displays selected items as tags</li>
          <li>Supports disabled state</li>
          <li>Supports custom labels and descriptions</li>
        </ul>
        
        <h3>Usage</h3>
        <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code><PersonaSelector
  v-model="selectedPersona"
  :personas="personas"
  :multiple="false"
  label="Select Persona"
  placeholder="Search persona..."
  description="Please select a persona"
  :filterable="true"
/></code></pre>
        
        <h3>Props</h3>
        <table class="w-full border-collapse">
          <thead>
            <tr>
              <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Prop</th>
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
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Enable multiple selection</td>
            </tr>
            <tr>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">filterable</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Enable search filtering</td>
            </tr>
            <tr>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">disabled</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
              <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Disable selector</td>
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
    </div>
  </div>
</template>

<script setup lang="ts">
import PersonaSelectorExample from '~/components/PersonaSelectorExample.vue';

definePageMeta({
  title: 'Persona Selector Component Demo'
});
</script>
