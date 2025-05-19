<template>
  <div class="container mx-auto py-8 px-4">
    <!-- Breadcrumb Navigation -->
    <div class="flex items-center text-sm mb-6">
      <NuxtLink to="/components" class="text-gray-500 hover:text-primary">Components</NuxtLink>
      <Icon name="ph:caret-right" class="mx-2 h-4 w-4 text-gray-400" />
      <span class="font-medium">PersonaSelector</span>
    </div>
    
    <!-- Component Title -->
    <div class="flex items-center justify-between mb-8">
      <div>
        <h1 class="text-3xl font-bold">PersonaSelector</h1>
        <p class="text-gray-600 dark:text-gray-300 mt-2">
          An advanced persona selector supporting single and multiple selection with search.
        </p>
      </div>
      <Badge variant="outline">Form Component</Badge>
    </div>
    
    <!-- Component Overview -->
    <Card class="mb-8">
      <CardContent class="pt-6">
        <p>
          PersonaSelector is an advanced selector built on the shadcn/ui Combobox component, designed for selecting personas. It supports both single and multiple selection modes, provides search filtering, and displays selected items as tags. Suitable for scenarios where one or more personas need to be selected from a list.
        </p>
      </CardContent>
    </Card>
    
    <!-- Component Examples -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Examples</h2>
      
      <!-- Basic Usage -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Basic Usage</CardTitle>
          <CardDescription>
            The most basic single selection mode, select one persona from the list.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelectorExample :multiple="false" />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code><template>
  <PersonaSelector
    v-model="selectedPersona"
    :personas="personas"
    label="Select Persona"
    placeholder="Search persona..."
    description="Please select a persona"
    :filterable="true"
  />
</template>

<!--
<script setup lang="ts">
import { ref } from 'vue';
import type { ApiPersona } from '~/types/persona';

const selectedPersona = ref<number | null>(null);
const personas = ref<ApiPersona[]>([
  {
    persona_id: 1,
    name: 'Historian',
    description: 'Focuses on historical events and cultural background',
    // other properties...
  },
  // other personas...
]);
</script>
--></code></pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <!-- Multiple Selection Mode -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Multiple Selection Mode</CardTitle>
          <CardDescription>
            Enable multiple selection by setting the <code>multiple</code> prop to <code>true</code>, allowing selection of multiple personas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelectorExample :multiple="true" />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code><template>
  <PersonaSelector
    v-model="selectedPersonas"
    :personas="personas"
    :multiple="true"
    label="Select Multiple Personas"
    placeholder="Search persona..."
    description="Please select multiple personas as guests"
    :filterable="true"
  />
</template>

<!--
<script setup lang="ts">
import { ref } from 'vue';
import type { ApiPersona } from '~/types/persona';

const selectedPersonas = ref<number[]>([]);
const personas = ref<ApiPersona[]>([
  {
    persona_id: 1,
    name: 'Historian',
    description: 'Focuses on historical events and cultural background',
    // other properties...
  },
  // other personas...
]);
</script>
--></code></pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      <!-- Disabled State -->
      <Card class="mb-8">
        <CardHeader>
          <CardTitle>Disabled State</CardTitle>
          <CardDescription>
            Disable the selector by setting the <code>disabled</code> prop to <code>true</code>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs default-value="preview">
            <TabsList>
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="code">Code</TabsTrigger>
            </TabsList>
            <TabsContent value="preview" class="p-4 border rounded-md mt-2">
              <div class="max-w-md mx-auto">
                <PersonaSelectorExample :disabled="true" />
              </div>
            </TabsContent>
            <TabsContent value="code" class="mt-2">
              <pre class="bg-gray-100 dark:bg-zinc-800 p-4 rounded-md overflow-auto"><code><template>
  <PersonaSelector
    v-model="selectedPersona"
    :personas="personas"
    label="Select Persona"
    placeholder="Search persona..."
    description="This selector is disabled"
    :filterable="true"
    :disabled="true"
  />
</template>
</code></pre>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
    
    <!-- API Documentation -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold mb-6">API</h2>
      
      <!-- Props -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Props</h3>
        <div class="overflow-x-auto">
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
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Selected persona ID or array of IDs, supports v-model two-way binding</td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">personas</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">ApiPersona[]</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">[]</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Persona data list, must include persona_id and name properties</td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">multiple</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Enable multiple selection, true for multiple, false for single</td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">filterable</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Enable search filtering, true to enable search</td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">disabled</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">boolean</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">false</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Disable selector, true to disable</td>
              </tr>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">label</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">string</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">undefined</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Selector label text</td>
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
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Selector description text, shown below the selector</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <!-- Events -->
      <div class="mb-8">
        <h3 class="text-xl font-semibold mb-4">Events</h3>
        <div class="overflow-x-auto">
          <table class="w-full border-collapse">
            <thead>
              <tr>
                <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Event</th>
                <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Params</th>
                <th class="border border-gray-300 dark:border-zinc-700 px-4 py-2 text-left">Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">update:modelValue</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">number | number[] | null</td>
                <td class="border border-gray-300 dark:border-zinc-700 px-4 py-2">Triggered when the selected value changes, param is the new value</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
    
    <!-- Best Practices -->
    <div class="mb-12">
      <h2 class="text-2xl font-bold mb-6">Best Practices</h2>
      <Card>
        <CardContent class="pt-6">
          <div class="space-y-4">
            <div>
              <h3 class="text-lg font-semibold mb-2">When to Use</h3>
              <ul class="list-disc pl-5 space-y-2">
                <li>
                  <strong>Single selection mode</strong>: Use when you need to select one persona from the list, e.g., selecting a host or speaker.
                </li>
                <li>
                  <strong>Multiple selection mode</strong>: Use when you need to select multiple personas, e.g., selecting guests or participants.
                </li>
              </ul>
            </div>
            
            <div>
              <h3 class="text-lg font-semibold mb-2">Usage Tips</h3>
              <ul class="list-disc pl-5 space-y-2">
                <li>
                  <strong>Search feature</strong>: When the persona list is long, enable the search feature (<code>filterable=true</code>) for better UX.
                </li>
                <li>
                  <strong>Description text</strong>: Provide clear description text to help users understand the purpose and requirements.
                </li>
                <li>
                  <strong>Tag display</strong>: In multiple selection mode, selected personas are displayed as tags. Users can remove them by clicking the delete button on the tag.
                </li>
                <li>
                  <strong>Data format</strong>: Ensure the personas data includes the required <code>persona_id</code> and <code>name</code> properties for selection and display.
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Related Components -->
    <div>
      <h2 class="text-2xl font-bold mb-6">Related Components</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent class="pt-6">
            <h3 class="text-lg font-semibold mb-2">Combobox</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Basic searchable dropdown selector. PersonaSelector is built on this component.
            </p>
            <div class="text-right">
              <Button variant="outline" size="sm" disabled>View Docs</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="pt-6">
            <h3 class="text-lg font-semibold mb-2">Select</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Basic dropdown selector, does not support search.
            </p>
            <div class="text-right">
              <Button variant="outline" size="sm" disabled>View Docs</Button>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent class="pt-6">
            <h3 class="text-lg font-semibold mb-2">MultiSelect</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Multi-select dropdown, supports selecting multiple options.
            </p>
            <div class="text-right">
              <Button variant="outline" size="sm" disabled>View Docs</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import PersonaSelectorExample from '~/components/PersonaSelectorExample.vue';

definePageMeta({
  title: 'PersonaSelector Component'
});
</script>
